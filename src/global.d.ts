export {};

declare global {
  interface Window {
    /** File System Access API — not yet in TypeScript's bundled DOM lib. Supported in Chromium-based browsers. */
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?: FileSystemHandle | string;
    }) => Promise<FileSystemDirectoryHandle>;
  }
}
