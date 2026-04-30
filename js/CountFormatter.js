export class CountFormatter {
    static parse(text) {
        const match = String(text).match(/^([\d.]+)([KM]?)$/);
        if (!match) return null;
        const [, num, suffix] = match;
        const multiplier = suffix === 'K' ? 1_000 : suffix === 'M' ? 1_000_000 : 1;
        return parseFloat(num) * multiplier;
    }

    static format(value) {
        if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (value >= 1_000)     return (value / 1_000).toFixed(1).replace(/\.0$/, '')     + 'K';
        return String(Math.max(0, Math.round(value)));
    }

    static bump(text, delta) {
        const value = this.parse(text);
        if (value === null) return text;
        return this.format(value + delta);
    }
}
