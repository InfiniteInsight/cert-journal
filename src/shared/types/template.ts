export interface Template {
  id: number;
  name: string;
  description?: string;
  requestor?: string;
  location?: string;
  distributionGroup?: string;
  notes?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  requestor?: string;
  location?: string;
  distributionGroup?: string;
  notes?: string;
  isDefault?: boolean;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: number;
}
