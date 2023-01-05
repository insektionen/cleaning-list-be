import { customAlphabet } from 'nanoid/async';

// Less than 1% risk of collision when 1000 generated/second for more than 1 quadrillion years
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-0123456789';
const LENGTH = 32;

const nanoid = customAlphabet(ALPHABET, LENGTH);

export default nanoid;
