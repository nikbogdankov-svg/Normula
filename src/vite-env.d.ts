/// <reference types="vite/client" />

declare module 'mammoth' {
  interface MammothResult {
    value: string;
    messages: unknown[];
  }

  interface Mammoth {
    extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<MammothResult>;
    convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<MammothResult>;
  }

  const mammoth: Mammoth;
  export default mammoth;
}
