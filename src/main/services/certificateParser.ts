import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import type { ParsedCertificate, CertificateFormat } from '../../shared/types';

/**
 * Parse a certificate file and extract relevant information
 */
export async function parseCertificateFile(
  filePath: string,
  password?: string
): Promise<ParsedCertificate> {
  const buffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const format = detectFormat(buffer, ext);

  let cert: forge.pki.Certificate;

  switch (format) {
    case 'pkcs12':
      cert = parsePKCS12(buffer, password);
      break;
    case 'der':
      cert = parseDER(buffer);
      break;
    case 'pem':
    default:
      cert = parsePEM(buffer);
      break;
  }

  return extractCertInfo(cert, fileName);
}

/**
 * Detect certificate format from file extension and content
 */
function detectFormat(buffer: Buffer, ext: string): CertificateFormat {
  // Check extension first
  if (['.p12', '.pfx'].includes(ext)) {
    return 'pkcs12';
  }

  if (ext === '.der') {
    return 'der';
  }

  // Try to detect from content
  const content = buffer.toString('utf-8');

  // PEM files start with -----BEGIN
  if (content.includes('-----BEGIN')) {
    return 'pem';
  }

  // If it's binary and not PKCS12, assume DER
  return 'der';
}

/**
 * Parse PEM-encoded certificate
 */
function parsePEM(buffer: Buffer): forge.pki.Certificate {
  const pem = buffer.toString('utf-8');

  // Handle certificate chains - extract just the first certificate
  const certMatch = pem.match(
    /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/
  );

  if (!certMatch) {
    throw new Error('No certificate found in PEM file');
  }

  return forge.pki.certificateFromPem(certMatch[0]);
}

/**
 * Parse DER-encoded certificate
 */
function parseDER(buffer: Buffer): forge.pki.Certificate {
  const derBuffer = forge.util.createBuffer(buffer.toString('binary'));
  const asn1 = forge.asn1.fromDer(derBuffer);
  return forge.pki.certificateFromAsn1(asn1);
}

/**
 * Parse PKCS#12/PFX file
 */
function parsePKCS12(buffer: Buffer, password?: string): forge.pki.Certificate {
  const p12Der = forge.util.createBuffer(buffer.toString('binary'));
  const p12Asn1 = forge.asn1.fromDer(p12Der);

  // Decode PKCS12 with password (empty string if not provided)
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password || '');

  // Get certificate bags
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const bags = certBags[forge.pki.oids.certBag];

  if (!bags || bags.length === 0) {
    throw new Error('No certificate found in PKCS12 file');
  }

  // Find the end-entity certificate (not a CA cert)
  // Usually this is the first one, but let's be safe
  for (const bag of bags) {
    if (bag.cert) {
      // Check if it's not a CA certificate (no basic constraints or not a CA)
      const basicConstraints = bag.cert.getExtension('basicConstraints');
      if (!basicConstraints || !(basicConstraints as { cA?: boolean }).cA) {
        return bag.cert;
      }
    }
  }

  // If all certs are CA certs, just return the first one
  const firstBag = bags[0];
  if (firstBag.cert) {
    return firstBag.cert;
  }

  throw new Error('No valid certificate found in PKCS12 file');
}

/**
 * Extract certificate information
 */
function extractCertInfo(
  cert: forge.pki.Certificate,
  fileName: string
): ParsedCertificate {
  // Get Common Name
  const cnField = cert.subject.getField('CN');
  const cn = cnField ? String(cnField.value) : 'Unknown';

  // Get Issuer (try CN first, then O)
  const issuerCN = cert.issuer.getField('CN');
  const issuerO = cert.issuer.getField('O');
  const issuingCA = issuerCN
    ? String(issuerCN.value)
    : issuerO
      ? String(issuerO.value)
      : 'Unknown';

  // Extract Subject Alternative Names
  const sans: string[] = [];
  const sanExt = cert.getExtension('subjectAltName') as {
    altNames?: Array<{ type: number; value: string }>;
  } | null;

  if (sanExt?.altNames) {
    for (const altName of sanExt.altNames) {
      // Type 2 = DNS name, Type 7 = IP address
      if (altName.type === 2 || altName.type === 7) {
        sans.push(altName.value);
      }
    }
  }

  // Get serial number (convert to hex string)
  const serialNumber = cert.serialNumber;

  // Get expiration date
  const expirationDate = cert.validity.notAfter;

  return {
    cn,
    sans,
    expirationDate,
    issuingCA,
    serialNumber,
    fileName,
  };
}

/**
 * Parse multiple certificate files
 */
export async function parseCertificateFiles(
  filePaths: string[],
  passwords?: Map<string, string>
): Promise<Array<ParsedCertificate | { error: string; fileName: string }>> {
  const results: Array<ParsedCertificate | { error: string; fileName: string }> = [];

  for (const filePath of filePaths) {
    try {
      const password = passwords?.get(filePath);
      const cert = await parseCertificateFile(filePath, password);
      results.push(cert);
    } catch (error) {
      results.push({
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName: path.basename(filePath),
      });
    }
  }

  return results;
}

/**
 * Check if a file requires a password (PKCS12)
 */
export function requiresPassword(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.p12', '.pfx'].includes(ext);
}
