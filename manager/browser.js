const puppeteer = require("puppeteer");

module.exports = class BrowserManager {
    constructor() {
        this.initialised = false;

        /**
         * @type {puppeteer.Browser}
         */
        this.browser = undefined;

        this.pages = {
            /**
             * @type {puppeteer.Page}
             */
            tournament: null
        };

        this.initialise();
    }

    async initialise() {
        this.browser = await puppeteer.launch({
            args: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage'],
            defaultViewport: {
                width: 1430, height: 600
            }
        });

        this.pages.tournament = await this.browser.newPage();
        await this.pages.tournament.goto("https://challonge.com/kh1no18r/module");

        this.initialised = true;
    }

    /**
     * @returns {Promise<Buffer>}
     */
    getTournamentShot() {
        // welp it was simpler than i expected
        return this.pages.tournament.screenshot({
            clip: {
                x: 0, y: 0, height: 500, width: 1430
            }
        });
    }
}