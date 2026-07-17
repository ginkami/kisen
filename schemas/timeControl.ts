/** Популярные форматы контроля времени в интеллектуальных играх */
export type TimeControlFormat =
  | 'absolute'   // Только основное время (Внезапная смерть / Sudden Death)
  | 'fischer'    // Фишер (Добавление секунд ПОСЛЕ каждого хода)
  | 'bronstein'  // Бронштейн (Возврат потраченного времени, но не более инкремента)
  | 'delay'      // Задержка / US Chess Delay (Время не течет первые X секунд хода)
  | 'byoyomi'    // Японское бёёми (Классика для Сёги и Го)
  | 'canadian';  // Канадское бёёми / Овертайм (X ходов за Y секунд)

export interface BaseTimeControl {
  /** Тип контроля времени */
  type: TimeControlFormat;
  /** Основное время на партию в секундах. 0 — если играется чистое бёёми с 1-го хода */
  mainTime: number; 
}

/** 1. Абсолютный контроль ("блиц/рапид без добавления") */
export interface AbsoluteTimeControl extends BaseTimeControl {
  type: 'absolute';
}

/** 2. Инкрементные контроли (Фишер, Бронштейн, Задержка) */
export interface IncrementTimeControl extends BaseTimeControl {
  type: 'fischer' | 'bronstein' | 'delay';
  /** Количество добавляемых секунд на каждый ход */
  increment: number; 
}

/** 3. Японское Бёёми
 * После окончания основного времени (mainTime) игроку дается N периодов по X секунд на ход.
 * Если уложился в X секунд — период не сгорает. Не уложился — теряешь 1 период.
 */
export interface ByoyomiTimeControl extends BaseTimeControl {
  type: 'byoyomi';
  /** Время на один ход в периоде бёёми (в секундах). Например: 30 или 60 */
  byoyomiTime: number;
  /** Количество периодов бёёми. Например: 5. (1 — означает "смертельное" бёёми) */
  byoyomiPeriods: number;
}

/** 4. Канадское Бёёми / Овертайм
 * После окончания основного времени нужно сделать X ходов за Y секунд.
 * Сделал — счетчик ходов сбрасывается, снова дается Y секунд на следующие X ходов.
 */
export interface CanadianTimeControl extends BaseTimeControl {
  type: 'canadian';
  /** Время, выделяемое на блок ходов (в секундах). Например: 300 (5 минут) */
  canadianTime: number;
  /** Количество ходов, которое необходимо успеть сделать за это время. Например: 25 */
  canadianMoves: number;
}

/** Единый тип контроля времени для схемы турнира */
export type TimeControl =
  | AbsoluteTimeControl
  | IncrementTimeControl
  | ByoyomiTimeControl
  | CanadianTimeControl;