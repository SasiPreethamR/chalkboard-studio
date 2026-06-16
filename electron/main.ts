import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { spawn, type ChildProcess } from 'node:child_process'
import { homedir, networkInterfaces } from 'node:os'
import { execFileSync } from 'node:child_process'

const __dirnameLocal = dirname(fileURLToPath(import.meta.url))
let weylusProc: ChildProcess | null = null

function weylusPort(): number {
  const parsed = Number.parseInt(process.env['WEYLUS_PORT'] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1701
}

function resolveWeylusCommand(): string {
  const configured = process.env['WEYLUS_PATH']?.trim()
  if (configured) return configured
  if (process.platform === 'darwin') {
    const appPath = '/Applications/Weylus.app/Contents/MacOS/weylus'
    if (existsSync(appPath)) return appPath
    const userAppPath = join(homedir(), 'Applications/Weylus.app/Contents/MacOS/weylus')
    if (existsSync(userAppPath)) return userAppPath
  }
  return 'weylus'
}

function startWeylus(): void {
  if (process.env['CHALKBOARD_WEYLUS'] === '0') return
  if (weylusProc) return
  const cmd = resolveWeylusCommand()
  const args = ['--no-gui']
  const port = weylusPort()
  if (port !== 1701) args.push('--web-port', String(port))
  const proc = spawn(cmd, args, {
    stdio: 'ignore',
    windowsHide: true
  })
  proc.once('error', () => {
    // Soft-fail: editor should still boot if Weylus is not installed.
    console.warn(
      '[weylus] Unable to start. Install Weylus or set WEYLUS_PATH. Disable with CHALKBOARD_WEYLUS=0.'
    )
    weylusProc = null
  })
  proc.once('exit', () => {
    weylusProc = null
  })
  weylusProc = proc
}

function stopWeylus(): void {
  if (!weylusProc) return
  weylusProc.kill()
  weylusProc = null
}

function macInterfaceIp(): string | null {
  if (process.platform !== 'darwin') return null
  const interfaces: string[] = []
  try {
    const route = execFileSync('/sbin/route', ['get', 'default'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
    const match = route.match(/interface:\s*(\S+)/)
    if (match?.[1]) interfaces.push(match[1])
  } catch {
    // Fall through to common macOS interface names.
  }
  for (const name of ['en0', 'en1']) {
    if (!interfaces.includes(name)) interfaces.push(name)
  }
  for (const name of interfaces) {
    try {
      const ip = execFileSync('/usr/sbin/ipconfig', ['getifaddr', name], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim()
      if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip
    } catch {
      // Try the next interface.
    }
  }
  return null
}

function localWeylusUrls(): string[] {
  const port = weylusPort()
  const phoneUrls = new Set<string>()
  const nets = networkInterfaces()
  for (const entries of Object.values(nets)) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue
      phoneUrls.add(`http://${entry.address}:${port}`)
    }
  }
  const macIp = macInterfaceIp()
  if (macIp) phoneUrls.add(`http://${macIp}:${port}`)
  return [...phoneUrls, `http://localhost:${port}`]
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    title: 'Chalkboard Studio',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirnameLocal, '../preload/index.cjs'),
      sandbox: false,
      // Enable smooth, low-latency pointer/stylus input.
      backgroundThrottling: false
    }
  })

  // electron-vite injects this env var in development.
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(join(__dirnameLocal, '../renderer/index.html'))
  }
}

// File persistence over IPC.
ipcMain.handle('doc:save', async (_e, json: string, suggestedName?: string) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save board',
    defaultPath: suggestedName ?? 'untitled.board.json',
    filters: [{ name: 'Chalkboard Document', extensions: ['board.json', 'json'] }]
  })
  if (canceled || !filePath) return { ok: false as const }
  await writeFile(filePath, json, 'utf-8')
  return { ok: true as const, filePath }
})

ipcMain.handle('doc:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Open board',
    properties: ['openFile'],
    filters: [{ name: 'Chalkboard Document', extensions: ['board.json', 'json'] }]
  })
  if (canceled || filePaths.length === 0) return { ok: false as const }
  const data = await readFile(filePaths[0], 'utf-8')
  return { ok: true as const, filePath: filePaths[0], data }
})

ipcMain.handle('file:exportBinary', async (_e, data: Uint8Array, suggestedName: string, ext: string) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export',
    defaultPath: suggestedName,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
  })
  if (canceled || !filePath) return { ok: false as const }
  await writeFile(filePath, Buffer.from(data))
  return { ok: true as const, filePath }
})

ipcMain.handle('weylus:info', () => {
  const urls = localWeylusUrls()
  const phoneUrl = urls.find((u) => !u.includes('localhost')) ?? urls[0]
  return {
    enabled: process.env['CHALKBOARD_WEYLUS'] !== '0',
    startedByEditor: weylusProc != null,
    command: resolveWeylusCommand(),
    port: weylusPort(),
    primaryUrl: phoneUrl,
    urls
  }
})

app.whenReady().then(() => {
  startWeylus()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  stopWeylus()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
