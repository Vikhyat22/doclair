declare module 'pdfmake/build/pdfmake.js' {
  const pdfMake: unknown
  export default pdfMake
}

declare module 'pdfmake/build/vfs_fonts.js' {
  const fonts: Record<string, string>
  export default fonts
}

declare module 'html-to-pdfmake' {
  const htmlToPdfmake: (markup: string, options?: Record<string, unknown>) => unknown
  export default htmlToPdfmake
}
