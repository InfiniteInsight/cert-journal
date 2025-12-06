// Extend File interface with Electron's path property
declare global {
  interface File {
    // Electron adds a `path` property to File objects from the file system
    readonly path: string;
  }
}

export {};
