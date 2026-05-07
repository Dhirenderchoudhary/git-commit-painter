#!/usr/bin/env node

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const moment = require('moment');
const { terminal: consoleUI } = require('terminal-kit');

const pkg = require('../package.json');
let glyphs = require('./charMap');

const DAYS_PER_WEEK = 7;
const SHADE_CHARS = ['░', '▒', '▓', '█'];

function interpolate(val, srcMin, srcMax, dstMin, dstMax) {
    return (val - srcMin) * (dstMax - dstMin) / (srcMax - srcMin) + dstMin;
}

function generateBadge() {
    return `[![](${pkg.badge})](${pkg.homepage})  \n[![](${pkg.logo})](${pkg.homepage})`;
}

program
    .version(pkg.version)
    .option('-s, --startdate [date]', 'starting date for the spray (snaps to nearest Sunday)')
    .option('-o, --origin [url]', 'remote repository URL')
    .option('-p, --push', 'auto-push to origin after generating')
    .option('--force', 'force-push to origin')
    .option('-f, --file [path]', 'path to a custom JSON pattern file')
    .option('-t, --text [string]', 'text string to render')
    .option('--font [name]', 'typography style to use')
    .option('-i, --invert', 'flip the color values')
    .option('-m, --multiplier [n]', 'scale the commit intensity', s => parseInt(s), 1)
    .option('--flipvertical', 'mirror the output vertically')
    .option('--fliphorizontal', 'mirror the output horizontally')
    .parse(process.argv);

const opts = program;

if (process.argv.length < 3) {
    program.help();
}

if (opts.push && !opts.origin) {
    console.warn('Error: --origin is required when using --push');
}

if (opts.font) {
    const typographyDir = path.resolve(__dirname, 'typography');
    const available = fs.readdirSync(typographyDir).map(f => f.slice(0, -3));
    if (!available.includes(opts.font)) {
        console.warn(`Font "${opts.font}" not found.\nAvailable: ${available.join(', ')}`);
        process.exit(1);
    }
    glyphs = require(path.join(typographyDir, opts.font));
}

if (!glyphs[' ']) {
    glyphs[' '] = new Array(DAYS_PER_WEEK).fill(' ');
}

let origin;
if (opts.startdate) {
    origin = moment(opts.startdate);
    origin.day(0);
} else {
    origin = moment.utc();
    origin.subtract(53, 'week');
    origin.day(7);
}
origin.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

let shape;
if (opts.file) {
    shape = JSON.parse(fs.readFileSync(opts.file, 'utf8'));
} else if (opts.text) {
    shape = new Array(DAYS_PER_WEEK).fill(' ');
    for (const ch of opts.text) {
        if (!(ch in glyphs)) {
            console.warn(`Character "${ch}" is not supported.`);
            console.info('Supported: ' + Object.keys(glyphs).join(' '));
            process.exit(1);
        }
        const glyph = glyphs[ch];
        for (let row = 0; row < glyph.length; row++) {
            shape[row] += glyph[row] + ' ';
        }
    }
} else {
    console.warn('Error: either --text or --file is required.');
    process.exit(1);
}

shape = shape.map(row => row.replace(/ /g, '0'));
let grid = shape.map(row => row.split('').map(Number));

let epoch = origin.unix();
const dirName = 'painted-' + crypto.randomBytes(6).toString('hex');
const readmeFile = 'readme.md';

fs.mkdirSync(dirName);
execSync(`git init ${dirName}`);
fs.writeFileSync(path.join(dirName, readmeFile), generateBadge());
execSync(`git -C ${dirName} add ${readmeFile}`);

consoleUI.windowTitle(pkg.name);
consoleUI.reset();
consoleUI.hideCursor();

const totalWeeks = Math.max(...grid.map(row => row.length));
const totalCells = totalWeeks * DAYS_PER_WEEK;

if (opts.invert) {
    const peak = Math.max(...grid.flat());
    grid = grid.map(row => row.map(cell => peak - cell));
}

if (opts.fliphorizontal) grid = grid.map(row => row.reverse());
if (opts.flipvertical) grid = grid.reverse();

let totalCommits = 0;
for (let week = 0; week < totalWeeks; week++) {
    for (let day = 0; day < DAYS_PER_WEEK; day++) {
        const cellIndex = week * DAYS_PER_WEEK + day + 1;
        const pct = cellIndex / totalCells;

        consoleUI.moveTo(1, DAYS_PER_WEEK + 1);
        consoleUI.bar(pct, { barStyle: consoleUI.brightWhite, innerSize: totalWeeks });

        const intensity = (grid[day]?.[week] || 0) * opts.multiplier;
        for (let c = 0; c < intensity; c++) {
            let shade = interpolate(c, 0, intensity - 1, 0, SHADE_CHARS.length - 1);
            if (isNaN(shade)) shade = SHADE_CHARS.length - 1;

            consoleUI.moveTo(week + 1, day + 1, SHADE_CHARS[Math.round(shade)]);
            execSync(`git -C ${dirName} commit --allow-empty --date="${epoch}" -am '${pkg.name}'`);
            totalCommits++;
        }
        epoch += 86400;
    }
}

consoleUI.moveTo(1, DAYS_PER_WEEK + 1);
consoleUI.eraseLine();
consoleUI.hideCursor(0);

console.info(`\n${dirName} generated (${totalCommits} commits), starting ${origin.format('ddd MMM DD YYYY')}`);

if (opts.origin) {
    console.info(`Setting remote origin: ${opts.origin}`);
    execSync(`git -C ${dirName} remote add origin ${opts.origin}`);
}

if (opts.push) {
    process.stdout.write('Pushing... ');
    execSync(`git -C ${dirName} push ${opts.force ? '--force' : ''} -u origin main`);
    console.info('Done.');
}
