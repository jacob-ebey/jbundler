import type * as React from "react";

export interface MatchRendererProps {
  routes?: any[];
  matches: any[];
}

export const MatchRenderer: React.FC<MatchRendererProps>;
