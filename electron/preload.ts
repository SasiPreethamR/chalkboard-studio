import { contextBridge, ipcRenderer } from 'electron'

export interface WeylusInfo {
  enabled: boolean
  startedByEditor: boolean
  command: string
  port: number
  primaryUrl: string
  urls: string[]
  bridgeReady?: boolean
}

const api = {
  saveDocument: (json: string, suggestedName?: string) =>
    ipcRenderer.invoke('doc:save', json, suggestedName) as Promise<
      { ok: true; filePath: string } | { ok: false }
    >,
  openDocument: () =>
    ipcRenderer.invoke('doc:open') as Promise<
      { ok: true; filePath: string; data: string } | { ok: false }
    >,
  exportBinary: (data: Uint8Array, suggestedName: string, ext: string) =>
    ipcRenderer.invoke('file:exportBinary', data, suggestedName, ext) as Promise<
      { ok: true; filePath: string } | { ok: false }
    >,
  getWeylusInfo: () => ipcRenderer.invoke('weylus:info') as Promise<WeylusInfo>
}

contextBridge.exposeInMainWorld('desktop', api)

export type DesktopApi = typeof api
