export interface OmeMetadata {
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  sizeC: number;
  sizeT: number;
  physicalSizeX?: number;
  physicalSizeY?: number;
  physicalSizeZ?: number;
  pixelType: string;
  dimensionOrder: string;
}

/**
 * Parse OME-XML metadata from a TIFF ImageDescription tag.
 * Returns null if the string is not valid OME-XML.
 */
export function parseOmeXml(xml: string): OmeMetadata | null {
  if (!xml || !xml.includes("<OME")) return null;

  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const pixels =
      doc.querySelector("Pixels") ??
      doc.getElementsByTagNameNS("http://www.openmicroscopy.org/Schemas/OME/2016-06", "Pixels").item(0);

    if (!pixels) return null;

    const getInt = (attr: string, fallback: number) => {
      const v = pixels.getAttribute(attr);
      return v ? parseInt(v, 10) : fallback;
    };
    const getFloat = (attr: string) => {
      const v = pixels.getAttribute(attr);
      return v ? parseFloat(v) : undefined;
    };

    return {
      sizeX: getInt("SizeX", 0),
      sizeY: getInt("SizeY", 0),
      sizeZ: getInt("SizeZ", 1),
      sizeC: getInt("SizeC", 1),
      sizeT: getInt("SizeT", 1),
      physicalSizeX: getFloat("PhysicalSizeX"),
      physicalSizeY: getFloat("PhysicalSizeY"),
      physicalSizeZ: getFloat("PhysicalSizeZ"),
      pixelType: pixels.getAttribute("Type") ?? "uint8",
      dimensionOrder: pixels.getAttribute("DimensionOrder") ?? "XYZCT",
    };
  } catch {
    return null;
  }
}
