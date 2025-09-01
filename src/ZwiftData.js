const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { getDocumentsPath } = require('platform-paths');

/**
 * @class ZwiftData
 * @description A class to handle Zwift game data and process management
 * 
 * @property {Function} log - Logging function, defaults to console.log
 * @property {string} exe - Executable name, defaults to 'ZwiftApp.exe'
 * @property {string} appFolder - Zwift installation folder path
 * @property {string} zwiftVerCurFilenameTxtPath - Path to version filename text file
 * @property {string} logTxtPath - Path to Zwift log file
 * @property {string} prefsXmlPath - Path to Zwift preferences XML file
 * @property {string} _version - Cached Zwift version
 * @property {number} _flagId - Cached flag/country ID
 * @property {number} _playerId - Cached player ID
 * @property {number} _sportId - Cached sport ID 
 * @property {number} _worldId - Cached world ID
 * @property {number} _courseId - Cached world ID
 * @property {Object} _process - Cached process object
 * 
 * @param {Object} [options={}] - Configuration options
 * @param {Function} [options.log] - Custom logging function
 * @param {string} [options.exe] - Custom executable name
 * @param {string} [options.appFolder] - Custom app folder path
 * @param {string} [options.zwiftVerCurFilenameTxtPath] - Custom version filename path
 * @param {string} [options.logTxtPath] - Custom log file path
 * @param {string} [options.prefsXmlPath] - Custom preferences file path
 * @param {string} [options.version] - Override version
 * @param {number} [options.flagId] - Override flag ID
 * @param {number} [options.playerId] - Override player ID
 * @param {number} [options.sportId] - Override sport ID
 * @param {number} [options.worldId] - Override world ID
 * @param {number} [options.courseId] - Override course ID
 */
class ZwiftData {
    constructor(options = {}) {
        this.log = options?.log || (() => { });
        this.logDebug = options?.logDebug || this.log;

        this.log('Testing the log function in ZwiftData');

        this.appFolder = options?.appFolder || '';
        this.zwiftVerCurFilenameTxtPath = options?.zwiftVerCurFilenameTxtPath || '';
        this.logTxtPath = options?.logTxtPath || '';
        this.prefsXmlPath = options?.prefsXmlPath || '';

        // override values (some or all) to avoid reading from files
        this._version = options?.version;
        this._flagId = options?.flagId;
        this._playerId = options?.playerId;
        this._sportId = options?.sportId;
        this._worldId = options?.worldId;
        this._courseId = options?.courseId;

        this.log('ZwiftData.js');
        this.log('this.exe:', this.exe);
        this.log('this.appFolder:', this.appFolder);
        this.log('this.zwiftVerCurFilenameTxtPath:', this.zwiftVerCurFilenameTxtPath);
        this.log('this.logTxtPath:', this.logTxtPath);
        this.log('this.prefsXmlPath:', this.prefsXmlPath);
        this.log('this._version:', this._version);
        this.log('this._flagId:', this._flagId);
        this.log('this._playerId:', this._playerId);
        this.log('this._sportId:', this._sportId);
        this.log('this._worldId:', this._worldId);
        this.log('this._courseId:', this._courseId);

        // find the path to %ProgramFiles(x86)%

        if (!this.appFolder) {
            try {
                if (os.platform() == 'win32') {
                    let programFiles = process.env['ProgramFiles(x86)'] || process.env.ProgramFiles || 'C:\\Program Files (x86)';
                    this.appFolder = path.resolve(programFiles, 'Zwift');
                }
                if (os.platform() == 'darwin') {
                    this.appFolder = path.resolve(os.homedir(), 'Library', 'Applications', 'Zwift');
                }
            } catch (e) {
                this.log('Caught error in finding Zwift app folder:', e);
            }
        }

        this.verCurFilenameTxt = this.verCurFilenameTxt || path.resolve(this.appFolder, 'Zwift_ver_cur_filename.txt');
    }

    /**
     * Initializes the Zwift data paths if they are not already set.
     * Sets up paths to log.txt and prefs.xml in the Zwift documents folder.
     * @async
     * @returns {Promise<boolean>} Returns true when initialization is complete
     * @throws {Error} May throw an error if getDocumentsPath() fails
     */
    async init() {
        if (!this.logTxtPath || !this?.prefsxmlPath) {
            const documentsPath = await getDocumentsPath();
            if (!this?.zwiftlog) {
                // zwiftlog: path to log.txt for Zwift
                this.logTxtPath = path.resolve(documentsPath, 'Zwift', 'Logs', 'Log.txt');
            }
            if (!this?.prefsxmlPath) {
                // prefsxml: path to prefs.xml for Zwift
                this.prefsxmlPath = path.resolve(documentsPath, 'Zwift', 'prefs.xml');
            }
        }
        return true;
    }

    /**
     * Reads the game version from version files or log file
     * @async
     * @returns {Promise<string>} The version number in format x.x.x
     */
    async getGameVersion() {
        if (this._version) {
            return this._version;
        }

        if (this.verCurFilenameTxt && fs.existsSync(this.verCurFilenameTxt)) {
            this.log('Zwift version filename file:', this.verCurFilenameTxt);
            try {
                let zwiftVerCurFilename = fs.readFileSync(this.verCurFilenameTxt, 'utf8').trim();
                let zwiftVerCurFile = path.resolve(this.appFolder, zwiftVerCurFilename);
                // remove trailing null bytes from zwiftVerCurFile
                zwiftVerCurFile = zwiftVerCurFile.replace(/\0/g, '');
                this.log('Zwift version file:', zwiftVerCurFile);
                let xml = fs.readFileSync(zwiftVerCurFile, 'utf8');
                // <Zwift version="1.0.139872" sversion="1.83.0 (139872)" gbranch="rc/1.83.0" gcommit="298e0a13bf6c23cfedb09968ae9490965c9e369c" GAME_URL="https://us-or-rly101.zwift.com" manifest="Zwift_1.0.139872_34608a9e_manifest.xml" manifest_checksum="-1006471014" ver_cur_checksum="-1183981758"/>
                // Find the version number in the XML in the sversion attribute
                let match = xml.match(/sversion="((?:\d+)\.(?:\d+)\.(?:\d+))/);
                if (match && match[1]) {
                    this.log(`Zwift seems to be version: ${match[1]}`);
                    // this.emit('info', `version ${match[1]}`)
                    return match[1];
                }
            } catch (e) {
                // 
                this.log('Caught error reading Zwift version file:', e);
            }
        }

        // Fall back to reading from log.txt

        // Determine game version from log.txt
        const version = /\[(?:[^\]]*)\]\s+Game Version: ((?:\d+)\.(?:\d+)\.(?:\d+))/g;
        let gameVersion = await this._getLast(version, 1) || '0.0.0';
        this.log(`Zwift seems to be version: ${gameVersion}`);

        return gameVersion;
    }

    /**
     * Gets the player's country flag ID from prefs.xml
     * @async
     * @returns {Promise<number|undefined>} The flag ID number or undefined if not found
     */
    async getFlagId() {
        if ((this._flagId ?? undefined) !== undefined) {
            return this._flagId;
        }
        // Determine country ID from prefs.xml
        this.log('Zwift prefs.xml file:', this.prefsxmlPath);
        if (fs.existsSync(this.prefsxmlPath)) {
            try {
                let prefsxmltxt = fs.readFileSync(this.prefsxmlPath, 'utf8');

                // <flag>208</flag>
                let patterns = {
                    flag: /<flag>(\d*)<\/flag>/g,
                };

                let match;

                while ((match = patterns.flag.exec(prefsxmltxt)) !== null) {
                    let flagid = parseInt(match[1]);
                    this.log(`Zwift seems to run with flag ID: ${flagid} = ${('00000000' + flagid.toString(16)).substr(-8)}`);
                    // this.emit('info', `flagid ${flagid}`)
                    return flagid;
                }
            } catch (error) {
                this.log('Caught error reading Zwift prefs.xml file:', error);
            }
        }
    }

    /**
     * Gets the player ID from log file
     * @async
     * @returns {Promise<number|undefined>} The player ID or undefined if not found
     */
    async getPlayerId() {
        if ((this._playerId ?? undefined) !== undefined) {
            return this._playerId;
        }
        const player = /\[(?:[^\]]*)\]\s+(?:NETCLIENT:){0,1}\[INFO\] Player ID: (\d*)/g;
        let found = await this._getLast(player, 1);
        if (found) {
            let playerId = parseInt(found);
            this.log(`Zwift seems to run with player ID: ${playerId} = ${('00000000' + playerId.toString(16)).substr(-8)}`);
            return playerId;
        }
    }

    /**
     * Gets the jersey ID from log file
     * @async
     * @returns {Promise<number|undefined>} The jersey ID or undefined if not found
     */
    async getJerseyId() {
        if ((this._jerseyId ?? undefined) !== undefined) {
            return this._jerseyId;
        }

        // [7:54:19] [Garage Last Selected] Player Profile Update set Jersey: 363655187, set Bike: 1029279076
        // [17:53:29] [Garage Last Selected] Player Profile Update for Cycling Jersey set 872957794
        // [12:46:00] DEBUG LEVEL: [Garage Last Selected] Jersey has been set 363655187

        const jersey = /\[(?:[^\]]*)\]\s+.*(?:set Jersey: |Jersey (?:has been )?set )(\d+)/g;
        let found = await this._getLast(jersey, 1);
        if (found) {
            let jerseyId = parseInt(found);
            this.log(`Zwift seems to run with jersey ID: ${jerseyId} = ${('00000000' + jerseyId.toString(16)).substr(-8)}`);
            return jerseyId;
        }
    }

    
    /**
     * Gets the bike ID from log file
     * @async
     * @returns {Promise<number|undefined>} The bike ID or undefined if not found
     */
    async getbikeId() {
        if ((this._bikeId ?? undefined) !== undefined) {
            return this._bikeId
        }
        // [7:54:19] [Garage Last Selected] Player Profile Update set Jersey: 363655187, set Bike: 1029279076

        const bike = /\[(?:[^\]]*)\]\s+.*(?:set Bike: )(\d+)/g;
        let found = await this._getLast(bike, 1)
        if (found) {
            let bikeId = parseInt(found);
            this.log(`Zwift seems to run with bike ID: ${bikeId} = ${('00000000' + bikeId.toString(16)).substr(-8)}`)
            return bikeId
        }
    }

    /**
     * Gets the current sport ID from log file
     * @async
     * @returns {Promise<number>} The sport ID (0 if not found)
     */
    async getSportId() {
        if ((this._sportId ?? undefined) !== undefined) {
            return this._sportId;
        }
        const sport = /\[([^\]]*)\]\s+Setting sport to (\S+)/g;
        let sportId = parseInt(await this._getLast(sport, 2) || 0);
        this.log(`Zwift seems to run with sport ID: ${sportId} = ${('00000000' + sportId.toString(16)).substr(-8)}`);
        return sportId;
    }

    /**
     * Gets the current world ID from log file
     * @async
     * @returns {Promise<number>} The world ID (0 if not found)
     */
    async getWorldId() {
        if ((this._worldId ?? undefined) !== undefined) {
            return this._worldId;
        }
        const world = /\[([^\]]*)\]\s+Loading WAD file 'assets\/Worlds\/world(\d*)\/data.wad/g;
        let worldId = parseInt(await this._getLast(world, 2) || 0);
        this.log(`Zwift seems to run in world ID: ${worldId} = ${('00000000' + worldId.toString(16)).substr(-8)}`);
        return worldId;
    }

    /**
     * Gets the current course ID from the world ID found in the log file
     * @async
     * @returns {Promise<number>} The course ID (0 if not found)
     */
    async getCourseId() {
        if ((this._courseId ?? undefined) !== undefined) {
            return this._courseId;
        }
        let worldId = await this.getWorldId() || 0;
        let courseId = 0;
        if (worldId === 0) {
            courseId = 6; // world 0 Default world
        } else if (worldId === 1) {
            courseId = 6; // world 1 Watopia
        } else if (worldId === 2) {
            courseId = 2; // world 2 Richmond
        } else {
            courseId = worldId + 4;
        }
        this.log(`Zwift seems to run on course ID: ${courseId} = ${('00000000' + courseId.toString(16)).substr(-8)}`);
        return courseId;
    }

    /**
     * Helper method to get the last matching item from a pattern in the log file
     * @private
     * @async
     * @param {RegExp} pattern - Regular expression pattern to match
     * @param {number} matchItem - Index of the capture group to return
     * @param {string} [key] - Unused parameter
     * @param {string} [description=''] - Unused parameter
     * @param {boolean} [emit=false] - Unused parameter
     * @returns {Promise<string|undefined>} The last matching value or undefined if not found
     */
    async _getLast(pattern, matchItem, key, description = '', emit = false) {
        if (fs.existsSync(this.logTxtPath)) {
            try {
                let logtxt = fs.readFileSync(this.logTxtPath, 'utf8');

                let match;
                let result;

                while ((match = pattern.exec(logtxt)) !== null) {
                    result = match[matchItem];
                }

                return result;
            } catch (error) {
                this.log('Caught error reading Zwift log file:', error);
            }
        }
    }

    /**
     * Closes any process handles or resources (placeholder method)
     */
    closeProcess() {
        // Placeholder - ZwiftData doesn't directly manage process handles anymore
    }
}

module.exports = ZwiftData;