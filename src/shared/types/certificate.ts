export interface ParsedCertificate {
  cn: string;
  sans: string[];
  expirationDate: Date;
  issuingCA: string;
  serialNumber: string;
  fileName: string;
}

export interface CertificateEntry extends ParsedCertificate {
  requestor: string;
  location: string;
  distributionGroup: string;
  notes: string;
  templateId?: number;
}

export type CertificateFormat = 'pem' | 'der' | 'pkcs12';
