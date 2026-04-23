import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type GameName = string;
export interface backendInterface {
    getAllHighScores(): Promise<Array<[GameName, bigint]>>;
    getHighScore(gameName: GameName): Promise<bigint>;
    submitScore(gameName: GameName, score: bigint): Promise<boolean>;
}
