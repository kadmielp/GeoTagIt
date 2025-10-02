import { Geotag } from '../types';

// Simple EXIF GPS tag writing for JPEG files
export async function writeGeotagToImage(imageBlob: Blob, geotag: Geotag): Promise<Blob> {
  const arrayBuffer = await imageBlob.arrayBuffer();
  const dataView = new DataView(arrayBuffer);

  // Check if it's a JPEG file
  if (dataView.getUint16(0) !== 0xFFD8) {
    throw new Error('Only JPEG files are supported for geotag writing');
  }

  // Find APP1 segment or create new one
  let offset = 2;
  let app1Offset = -1;

  while (offset < dataView.byteLength - 1) {
    const marker = dataView.getUint16(offset);

    if (marker === 0xFFE1) { // APP1 segment
      app1Offset = offset;
      break;
    } else if (marker === 0xFFDA) { // Start of scan - insert before this
      break;
    } else if ((marker & 0xFF00) === 0xFF00) {
      const segmentLength = dataView.getUint16(offset + 2);
      offset += 2 + segmentLength;
    } else {
      offset++;
    }
  }

  // Create EXIF data with GPS information
  const exifData = createExifWithGPS(geotag);

  // Create new JPEG with embedded EXIF
  const result = new Uint8Array(arrayBuffer.byteLength + exifData.byteLength + 4);
  let resultOffset = 0;

  // Copy JPEG header
  result.set(new Uint8Array(arrayBuffer, 0, 2), resultOffset);
  resultOffset += 2;

  // Insert APP1 segment with EXIF
  result[resultOffset++] = 0xFF;
  result[resultOffset++] = 0xE1;
  result[resultOffset++] = (exifData.byteLength + 2) >> 8;
  result[resultOffset++] = (exifData.byteLength + 2) & 0xFF;
  result.set(exifData, resultOffset);
  resultOffset += exifData.byteLength;

  // Copy rest of JPEG (skip existing APP1 if present)
  const skipOffset = app1Offset === -1 ? 2 : offset;
  result.set(new Uint8Array(arrayBuffer, skipOffset), resultOffset);

  return new Blob([result], { type: 'image/jpeg' });
}

function createExifWithGPS(geotag: Geotag): Uint8Array {
  // Create minimal EXIF structure with GPS data
  const exifHeader = new Uint8Array([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x49, 0x49, 0x2A, 0x00, // Little endian TIFF header
    0x08, 0x00, 0x00, 0x00  // Offset to first IFD
  ]);

  // Convert lat/lng to GPS format
  const latRef = geotag.lat >= 0 ? 'N' : 'S';
  const lngRef = geotag.lng >= 0 ? 'E' : 'W';
  const latDMS = decimalToDMS(Math.abs(geotag.lat));
  const lngDMS = decimalToDMS(Math.abs(geotag.lng));

  // Create GPS IFD
  const gpsIfd = createGPSIFD(latRef, latDMS, lngRef, lngDMS);

  // Create main IFD with GPS pointer
  const mainIfd = createMainIFD(exifHeader.byteLength + 12); // Offset to GPS IFD

  // Combine all parts
  const result = new Uint8Array(exifHeader.byteLength + mainIfd.byteLength + gpsIfd.byteLength);
  let offset = 0;

  result.set(exifHeader, offset);
  offset += exifHeader.byteLength;

  result.set(mainIfd, offset);
  offset += mainIfd.byteLength;

  result.set(gpsIfd, offset);

  return result;
}

function decimalToDMS(decimal: number): [number, number, number] {
  const degrees = Math.floor(decimal);
  const minutesFloat = (decimal - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return [degrees, minutes, seconds];
}

function createMainIFD(gpsIfdOffset: number): Uint8Array {
  const ifd = new Uint8Array(14); // 1 entry + next IFD offset
  const view = new DataView(ifd.buffer);

  view.setUint16(0, 1, true); // Number of entries

  // GPS IFD pointer tag
  view.setUint16(2, 0x8825, true); // GPS IFD tag
  view.setUint16(4, 4, true); // Type: LONG
  view.setUint32(6, 1, true); // Count
  view.setUint32(10, gpsIfdOffset, true); // Offset to GPS IFD

  view.setUint32(12, 0, true); // Next IFD offset (none)

  return ifd;
}

function createGPSIFD(latRef: string, latDMS: [number, number, number], lngRef: string, lngDMS: [number, number, number]): Uint8Array {
  const ifd = new Uint8Array(62); // 5 entries + next IFD offset + data
  const view = new DataView(ifd.buffer);

  view.setUint16(0, 5, true); // Number of entries

  let entryOffset = 2;
  let dataOffset = 62;

  // GPS Version ID
  view.setUint16(entryOffset, 0x0000, true); // Tag
  view.setUint16(entryOffset + 2, 1, true); // Type: BYTE
  view.setUint32(entryOffset + 4, 4, true); // Count
  view.setUint8(entryOffset + 8, 2);
  view.setUint8(entryOffset + 9, 3);
  view.setUint8(entryOffset + 10, 0);
  view.setUint8(entryOffset + 11, 0);
  entryOffset += 12;

  // GPS Latitude Ref
  view.setUint16(entryOffset, 0x0001, true);
  view.setUint16(entryOffset + 2, 2, true); // Type: ASCII
  view.setUint32(entryOffset + 4, 2, true);
  view.setUint8(entryOffset + 8, latRef.charCodeAt(0));
  view.setUint8(entryOffset + 9, 0);
  entryOffset += 12;

  // GPS Latitude
  view.setUint16(entryOffset, 0x0002, true);
  view.setUint16(entryOffset + 2, 5, true); // Type: RATIONAL
  view.setUint32(entryOffset + 4, 3, true);
  view.setUint32(entryOffset + 8, dataOffset, true);

  // Write latitude rationals at dataOffset
  view.setUint32(dataOffset, latDMS[0], true);
  view.setUint32(dataOffset + 4, 1, true);
  view.setUint32(dataOffset + 8, latDMS[1], true);
  view.setUint32(dataOffset + 12, 1, true);
  view.setUint32(dataOffset + 16, Math.round(latDMS[2] * 1000), true);
  view.setUint32(dataOffset + 20, 1000, true);
  dataOffset += 24;
  entryOffset += 12;

  // GPS Longitude Ref
  view.setUint16(entryOffset, 0x0003, true);
  view.setUint16(entryOffset + 2, 2, true);
  view.setUint32(entryOffset + 4, 2, true);
  view.setUint8(entryOffset + 8, lngRef.charCodeAt(0));
  view.setUint8(entryOffset + 9, 0);
  entryOffset += 12;

  // GPS Longitude
  view.setUint16(entryOffset, 0x0004, true);
  view.setUint16(entryOffset + 2, 5, true);
  view.setUint32(entryOffset + 4, 3, true);
  view.setUint32(entryOffset + 8, dataOffset, true);

  // Write longitude rationals
  view.setUint32(dataOffset, lngDMS[0], true);
  view.setUint32(dataOffset + 4, 1, true);
  view.setUint32(dataOffset + 8, lngDMS[1], true);
  view.setUint32(dataOffset + 12, 1, true);
  view.setUint32(dataOffset + 16, Math.round(lngDMS[2] * 1000), true);
  view.setUint32(dataOffset + 20, 1000, true);

  view.setUint32(entryOffset + 12, 0, true); // Next IFD offset

  return ifd;
}

export async function downloadImageWithGeotag(photo: { name: string; dataUrl: string }, geotag: Geotag): Promise<void> {
  try {
    // Fetch the image data
    const response = await fetch(photo.dataUrl);
    const blob = await response.blob();

    // Write geotag to image
    const modifiedBlob = await writeGeotagToImage(blob, geotag);

    // Create download link
    const url = URL.createObjectURL(modifiedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = photo.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading image with geotag:', error);
    throw error;
  }
}