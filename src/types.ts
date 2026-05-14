export interface ModeValue {
  value: string;
  alias: string;
}

export interface FigmaColor {
  variableId: string;
}

export interface FigmaTypography {
  stylePath: string;
  sourceVariableIds: Record<string, string>;
}

export interface CssInfo {
  var: string | null;
  futureVar: string | null;
}

export interface TypographyProperties {
  fontFamily: string;
  fontWeight: number;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
}

export interface TokenRecord {
  id: string;
  kind: "color" | "typography-style";
  category: string;
  path: string;
  name?: string;
  description: string;
  notFor?: string[];
  status: string;
  recommend: boolean;
  figma: FigmaColor | FigmaTypography;
  modeValues?: Record<string, ModeValue>;
  css?: CssInfo;
  properties?: TypographyProperties;
  searchTerms: string[];
  componentTerms?: string[];
  componentPhrases?: string[];
}

export interface AdvisorIndex {
  version: number;
  scope: { included: string[]; excluded: string[] };
  counts: {
    total: number;
    colors: number;
    typography: number;
    recommended: number;
    notRecommended: number;
  };
  records: TokenRecord[];
}
