declare module 'pdfmake/build/pdfmake.js' {
  const pdfMake: unknown
  export default pdfMake
}

declare module 'pdfmake/build/vfs_fonts.js' {
  const fonts: Record<string, string>
  export default fonts
}

declare module 'pdfmake/build/standard-fonts/Times.js' {
  const fonts: {
    vfs: Record<string, string>
    fonts: Record<string, {
      normal: string
      bold: string
      italics: string
      bolditalics: string
    }>
  }
  export default fonts
}

declare module 'pdfmake/build/standard-fonts/Helvetica.js' {
  const fonts: {
    vfs: Record<string, string>
    fonts: Record<string, {
      normal: string
      bold: string
      italics: string
      bolditalics: string
    }>
  }
  export default fonts
}

declare module 'pdfmake/build/standard-fonts/Courier.js' {
  const fonts: {
    vfs: Record<string, string>
    fonts: Record<string, {
      normal: string
      bold: string
      italics: string
      bolditalics: string
    }>
  }
  export default fonts
}

declare module 'html-to-pdfmake' {
  const htmlToPdfmake: (markup: string, options?: Record<string, unknown>) => unknown
  export default htmlToPdfmake
}
