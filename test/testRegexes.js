// Test script to run ZwiftData._getAll for all log-based regexes and print matches
const ZwiftData = require('../src/ZwiftData');

(async () => {
    const zw = new ZwiftData({ log: console.log, logDebug: console.debug });
    await zw.init();

    const patterns = [
        { name: 'Game Version', regex: ZwiftData.VERSION_REGEX, group: 1 },
        { name: 'Player ID', regex: ZwiftData.PLAYER_REGEX, group: 1 },
        { name: 'Jersey ID', regex: ZwiftData.JERSEY_REGEX, group: 1 },
        { name: 'Bike ID', regex: ZwiftData.BIKE_REGEX, group: 1 },
        { name: 'Sport ID', regex: ZwiftData.SPORT_REGEX, group: 2 },
        { name: 'World ID', regex: ZwiftData.WORLD_REGEX, group: 2 },
    ];

    for (const p of patterns) {
        console.log('\n---', p.name, '---');
        try {
            const matches = await zw._getAll(p.regex, p.group);
            if (!matches || matches.length === 0) {
                console.log('No matches found in log.txt for pattern:', p.name);
                continue;
            }

            console.log(`Found ${matches.length} matches for pattern: ${p.name}`);
            const sample = matches.slice(0, 20);
            sample.forEach((m, i) => console.log(`${i + 1}: ${m}`));
            if (matches.length > sample.length) {
                console.log(`...and ${matches.length - sample.length} more`);
            }
        } catch (err) {
            console.error('Error while testing pattern', p.name, err);
        }
    }

    // exit explicitly so scripts running this file terminate
    process.exit(0);
})();
