export interface SimilarIndustryDataRow {
  majorCategory: string;
  mediumCategory: string;
  minorCategory: string;
  no: number;
  A: number; // Stock Price
  B_prime: number; // Dividend
  C_prime: number; // Profit
  D_prime: number; // Net Assets
  year?: string;
  monthlyA?: Record<string, number>;
}

export interface SimilarIndustryDatabase {
  [year: string]: SimilarIndustryDataRow[];
}

export const similarIndustryDatabase: SimilarIndustryDatabase = {
  "令和7年": [
    { majorCategory: "建設業", mediumCategory: "総合工事業", minorCategory: "建築工事業(木造建築工事業を除く)", no: 3, A: 516, B_prime: 15.0, C_prime: 88, D_prime: 608 },
    { majorCategory: "建設業", mediumCategory: "総合工事業", minorCategory: "その他の総合工事業", no: 4, A: 381, B_prime: 9.9, C_prime: 47, D_prime: 507 },
    { majorCategory: "製造業", mediumCategory: "食料品製造業", minorCategory: "畜産食料品製造業", no: 11, A: 444, B_prime: 8.2, C_prime: 44, D_prime: 362 },
  ],
  "令和6年": [
    { majorCategory: "建設業", mediumCategory: "総合工事業", minorCategory: "建築工事業(木造建築工事業を除く)", no: 3, A: 373, B_prime: 11.1, C_prime: 73, D_prime: 458 },
    { majorCategory: "建設業", mediumCategory: "総合工事業", minorCategory: "その他の総合工事業", no: 4, A: 311, B_prime: 8.4, C_prime: 39, D_prime: 398 },
    { majorCategory: "製造業", mediumCategory: "食料品製造業", minorCategory: "畜産食料品製造業", no: 12, A: 453, B_prime: 8.0, C_prime: 34, D_prime: 351 },
  ],
  "令和5年": [
    { majorCategory: "建設業", mediumCategory: "総合工事業", minorCategory: "建築工事業(木造建築工事業を除く)", no: 3, A: 339, B_prime: 9.9, C_prime: 72, D_prime: 432 },
    { majorCategory: "建設業", mediumCategory: "総合工事業", minorCategory: "その他の総合工事業", no: 4, A: 251, B_prime: 7.6, C_prime: 41, D_prime: 384 },
    { majorCategory: "製造業", mediumCategory: "食料品製造業", minorCategory: "畜産食料品製造業", no: 12, A: 988, B_prime: 10.6, C_prime: 73, D_prime: 518 },
  ],
};