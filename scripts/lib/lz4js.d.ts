declare module "lz4js" {
  function decompressBlock(
    src: Uint8Array,
    dst: Uint8Array,
    sIndex: number,
    sLength: number,
    dIndex: number,
  ): number;

  export { decompressBlock };
  const lz4: { decompressBlock: typeof decompressBlock };
  export default lz4;
}
