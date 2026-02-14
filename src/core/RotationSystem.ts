/**
 * Super Rotation System (SRS) — wall kick data and rotation logic.
 */

import { Board } from './Board.js';
import { PieceType, getCells } from './Tetrominoes.js';

/**
 * Wall kick offset data for JLSTZ pieces.
 * Key format: "fromState>toState"
 * Each entry is an array of [colOffset, rowOffset] kick tests.
 * Row offset is inverted (negative = up) per SRS convention mapped to our grid.
 */
const JLSTZ_KICKS: Record<string, [number, number][]> = {
    '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

/** Wall kick offset data for I piece (different from JLSTZ) */
const I_KICKS: Record<string, [number, number][]> = {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

export interface RotationResult {
    newRotation: number;
    kickCol: number;  // column offset applied
    kickRow: number;  // row offset applied
    isTSpin: boolean;
    isTSpinMini: boolean;
}

/**
 * Attempt to rotate a piece using SRS wall kicks.
 * @param direction 1 for CW, -1 for CCW
 * @returns RotationResult if successful, null if rotation is impossible
 */
export function tryRotate(
    board: Board,
    type: PieceType,
    currentRotation: number,
    originRow: number,
    originCol: number,
    direction: 1 | -1
): RotationResult | null {
    const fromState = currentRotation & 3;
    const toState = ((currentRotation + direction) % 4 + 4) % 4;

    // O piece doesn't rotate
    if (type === PieceType.O) {
        return null;
    }

    const kickKey = `${fromState}>${toState}`;
    const kicks = type === PieceType.I ? I_KICKS[kickKey] : JLSTZ_KICKS[kickKey];

    if (!kicks) return null;

    for (const [colOff, rowOff] of kicks) {
        const newCol = originCol + colOff;
        const newRow = originRow - rowOff; // Negate because SRS row offsets are inverted

        if (board.isValidPosition(type, toState, newRow, newCol)) {
            // Check for T-spin
            let isTSpin = false;
            let isTSpinMini = false;

            if (type === PieceType.T) {
                const tSpinResult = checkTSpin(board, toState, newRow, newCol, colOff, rowOff);
                isTSpin = tSpinResult.isTSpin;
                isTSpinMini = tSpinResult.isMini;
            }

            return {
                newRotation: toState,
                kickCol: colOff,
                kickRow: -rowOff,
                isTSpin,
                isTSpinMini,
            };
        }
    }

    return null;
}

/**
 * T-spin detection using the 3-corner rule.
 * A T-spin occurs when:
 * 1. The last move was a rotation
 * 2. At least 3 of the 4 corners around the T's center are occupied
 *
 * A T-spin mini occurs when only 2 front corners are filled (not both),
 * unless the kick used test 4 (index 3), in which case it's a full T-spin.
 */
function checkTSpin(
    board: Board,
    rotation: number,
    originRow: number,
    originCol: number,
    kickColOff: number,
    kickRowOff: number
): { isTSpin: boolean; isMini: boolean } {
    // T piece center is at (originRow + 1, originCol + 1) for state 0
    // We need to find the center of the T for the current rotation
    const cells = getCells(PieceType.T, rotation);
    // The center cell of T is always the one shared by all rotations: the "stem" intersection
    // For T piece, center is always at index 2 in our definition (row 1, col 1 for state 0)
    const center = cells[2]; // The center cell
    const centerRow = originRow + center.row;
    const centerCol = originCol + center.col;

    // Check the 4 corners around the center
    const corners = [
        { row: centerRow - 1, col: centerCol - 1 },
        { row: centerRow - 1, col: centerCol + 1 },
        { row: centerRow + 1, col: centerCol - 1 },
        { row: centerRow + 1, col: centerCol + 1 },
    ];

    const cornerOccupied = corners.map(c => {
        const val = board.getCell(c.row, c.col);
        return val !== null; // wall or piece
    });

    const occupiedCount = cornerOccupied.filter(Boolean).length;

    if (occupiedCount < 3) {
        return { isTSpin: false, isMini: false };
    }

    // Determine front corners based on rotation state
    // The "front" of the T is where the flat side faces
    let frontCorners: [number, number];
    switch (rotation) {
        case 0: frontCorners = [0, 1]; break; // top-left, top-right
        case 1: frontCorners = [1, 3]; break; // top-right, bottom-right
        case 2: frontCorners = [2, 3]; break; // bottom-left, bottom-right
        case 3: frontCorners = [0, 2]; break; // top-left, bottom-left
        default: frontCorners = [0, 1];
    }

    const bothFrontOccupied = cornerOccupied[frontCorners[0]] && cornerOccupied[frontCorners[1]];

    if (bothFrontOccupied) {
        return { isTSpin: true, isMini: false };
    }

    // It's a T-spin mini unless a significant kick was used (kick test 4, but we approximate)
    const isSignificantKick = Math.abs(kickColOff) > 1 || Math.abs(kickRowOff) > 1;
    if (isSignificantKick) {
        return { isTSpin: true, isMini: false };
    }

    return { isTSpin: true, isMini: true };
}
