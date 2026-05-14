export interface ModeValue {
  value: string;
  alias: string;
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
  status: string;
  recommend: boolean;
  modeValues?: Record<string, ModeValue>;
  css?: CssInfo;
  properties?: TypographyProperties;
  searchTerms: string[];
  /** High-confidence terms derived from actual component token assignments in Figma.
   *  Weighted much higher than description-derived searchTerms in the scorer. */
  componentTerms: string[];
  /** Full usage phrases from component mappings (higher precision than split terms). */
  componentPhrases: string[];
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

export type AppMode = "search" | "browse" | "audit";
export type TokenKind = "color" | "typography-style" | "all";
