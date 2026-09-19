export type TieBreakType =
  | 'points'           // Очки (PTS)
  | 'buchholz'         // Бухгольц полный (BH)
  | 'buchholz_cut'     // Бухгольц усеченный (BHC)
  | 'buchholz_median'  // Медианный Бухгольц (MCH)
  | 'buchholz_plus'    // Бухгольц+ (BH+)
  | 'sonneborn_berger' // Зоннеборн-Бергер (SB)
  | 'direct_encounter' // Личная встреча (DE)
  | 'wins_count'       // Количество побед
  | 'sl_points'        // СЛ Баллы (SL Pts)

export interface BaseTieBreak {
  /** Идентификатор типа коэффициента */
  type: TieBreakType;
  /** Включен ли коэффициент (для удобства UI-переключателей) */
  isVisible?: boolean; 
}

/** Специфичный интерфейс для Усечённого Бухгольца */
export interface BuchholzCutTieBreak extends BaseTieBreak {
  type: 'buchholz_cut';
  /** Сколько худших результатов отбросить. По умолчанию 1*/
  cutCount: number; 
}

/** Единый тип для элемента массива критериев */
export type TieBreak = BaseTieBreak | BuchholzCutTieBreak;