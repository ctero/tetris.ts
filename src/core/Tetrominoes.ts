/**
 * Tetromino definitions following the Tetris Guideline.
 * Each piece has 4 rotation states (0, R, 2, L) defined as cell offsets from pivot.
 */

export enum PieceType {
    I = 'I',
    O = 'O',
    T = 'T',
    S = 'S',
    Z = 'Z',
    J = 'J',
    L = 'L',
}

export interface Cell {
    row: number;
    col: number;
}

/** Each rotation state is an array of 4 cell offsets relative to the piece origin. */
export type RotationStates = [Cell[], Cell[], Cell[], Cell[]];

export interface TetrominoDef {
    type: PieceType;
    color: number;     // hex color
    glowColor: number; // lighter glow variant
    states: RotationStates;
}

/**
 * SRS rotation states for all 7 pieces.
 * States indexed 0=spawn, 1=CW, 2=180, 3=CCW
 * Cells are {row, col} offsets from the piece's logical origin.
 * Row increases downward.
 */
const PIECE_DATA: Record<PieceType, { color: number; glowColor: number; states: RotationStates }> = {
    [PieceType.I]: {
        color: 0x00f0f0,
        glowColor: 0x66ffff,
        states: [
            // State 0 (spawn)
            [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }],
            // State R (CW from spawn)
            [{ row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 }, { row: 3, col: 2 }],
            // State 2
            [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }],
            // State L (CCW from spawn)
            [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 }],
        ],
    },
    [PieceType.O]: {
        color: 0xf0f000,
        glowColor: 0xffff66,
        states: [
            [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
            [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
            [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
            [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
        ],
    },
    [PieceType.T]: {
        color: 0xa000f0,
        glowColor: 0xcc66ff,
        states: [
            [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
            [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }],
            [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }],
            [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
        ],
    },
    [PieceType.S]: {
        color: 0x00f000,
        glowColor: 0x66ff66,
        states: [
            [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
            [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 2 }],
            [{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 1 }],
            [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
        ],
    },
    [PieceType.Z]: {
        color: 0xf00000,
        glowColor: 0xff6666,
        states: [
            [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
            [{ row: 0, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }],
            [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
            [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }],
        ],
    },
    [PieceType.J]: {
        color: 0x0000f0,
        glowColor: 0x6666ff,
        states: [
            [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
            [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
            [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 2 }],
            [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }],
        ],
    },
    [PieceType.L]: {
        color: 0xf0a000,
        glowColor: 0xffcc66,
        states: [
            [{ row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
            [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
            [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 0 }],
            [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
        ],
    },
};

export const TETROMINOES: Record<PieceType, TetrominoDef> = Object.fromEntries(
    Object.entries(PIECE_DATA).map(([type, data]) => [
        type,
        { type: type as PieceType, ...data },
    ])
) as Record<PieceType, TetrominoDef>;

export const ALL_PIECE_TYPES: PieceType[] = [
    PieceType.I, PieceType.O, PieceType.T,
    PieceType.S, PieceType.Z, PieceType.J, PieceType.L,
];

/** Get the cells for a given piece type and rotation state */
export function getCells(type: PieceType, rotation: number): Cell[] {
    return TETROMINOES[type].states[rotation & 3];
}

/** Get the absolute board positions for a piece at (originRow, originCol) */
export function getAbsoluteCells(
    type: PieceType,
    rotation: number,
    originRow: number,
    originCol: number
): Cell[] {
    return getCells(type, rotation).map(c => ({
        row: c.row + originRow,
        col: c.col + originCol,
    }));
}
