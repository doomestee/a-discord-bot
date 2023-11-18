module.exports = {
    /**
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    randomNumber(min, max) {
        return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    },
    /**
     * @param {string} strong 
     * @param {number} length This can't obviously be lower than 3.
     */
    trimString(strong, length) {
        strong = strong.trim();
        return (strong.length < length) ? strong : strong.slice(0, length-3) + '...';
    }, epoch: {
        // I forgot what this is for
        special0: 1108382400000
    }, regexes: {
        grabWordsInsideEqualitySymbols: /\<.{0,}\>/g,
        dateFormatWithEunderscore: /(E_|)\d{2}-\d{2}-\d{4}/gi,
        sanitiseEmojiName: / *\([^)]*\) */g, // Only removes parenthesis
        snowflake: /\d{17,21}/g
    },
    sleep(ms=1000) {
        return new Promise((resolve) => {
          setTimeout(resolve, ms);
        });
    }, 
    /**
     * If shorten is true, it's better to put empty string for replace.
     * replace only works for hide.
     */
    getTime: (milli, hide=false, replace=', ', shorten=false) => {
        let result = [];

        let time = new Date(milli);
        //let months = time.getUTCMonth();
        let days = (Math.floor(time.getTime()/(1000*60*60*24)));
        let hours = time.getUTCHours().toString().padStart(2, '0');
        let minutes = time.getUTCMinutes().toString().padStart(2, '0');
        let seconds = time.getUTCSeconds().toString().padStart(2, '0');
        //let milliseconds = time.getUTCMilliseconds(); // too precise which is sad enough imo

        if (days) result.push(days + ((!shorten) ? ' days' : 'd'));
        if (hours != '00' || days) result.push(hours + ((!shorten) ? ' hours' : 'h')); // 3 hours and no days
        if (minutes != '00' || (hours != '00' || days)) result.push(minutes + ((!shorten) ? ' minutes' : 'm'));
        if (seconds != '00' || (minutes != '00' || hours != '00' || days)) result.push(seconds + ((!shorten) ? ' seconds' : 's'));

        if (hide)
            return result.join((typeof(replace) === 'string') ? replace : ', ');//return `${(!days) ? '' : days + ' days, '}${(hours == '00') ? '' : hours + ' hours, '}${(minutes == '00') ? '' : minutes + ' minutes, '}${(seconds == '00') ? '' : seconds + ' seconds, '}`;
        else
            return (!shorten) ? `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds` : `${days}d${hours}h${minutes}m${seconds}s`;
    },
    /**
     * Created by someone, danke.
     * @param {Uint8Array} arrayBuffer Must be already parsed as UInt8Array
    **/
    UInt8ArrayToBase64String: (arrayBuffer) => {
        let base64      = '';
        const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      
        const bytes         = arrayBuffer;
        const byteLength    = bytes.byteLength;
        const byteRemainder = byteLength % 3;
        const mainLength    = byteLength - byteRemainder;
      
        let a, b, c, d;
        let chunk;
      
        // Main loop deals with bytes in chunks of 3
        for (let i = 0; i < mainLength; i = i + 3) {
          // Combine the three bytes into a single integer
          chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      
          // Use bitmasks to extract 6-bit segments from the triplet
          a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
          b = (chunk & 258048)   >> 12; // 258048   = (2^6 - 1) << 12
          c = (chunk & 4032)     >>  6; // 4032     = (2^6 - 1) << 6
          d = chunk & 63;               // 63       = 2^6 - 1
      
          // Convert the raw binary segments to the appropriate ASCII encoding
          base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
        }
      
        // Deal with the remaining bytes and padding
        if (byteRemainder == 1) {
          chunk = bytes[mainLength];
      
          a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
      
          // Set the 4 least significant bits to zero
          b = (chunk & 3)   << 4; // 3   = 2^2 - 1
      
          base64 += encodings[a] + encodings[b] + '=='
        } else if (byteRemainder == 2) {
          chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
      
          a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
          b = (chunk & 1008)  >>  4; // 1008  = (2^6 - 1) << 4
      
          // Set the 2 least significant bits to zero
          c = (chunk & 15)    <<  2; // 15    = 2^4 - 1
      
          base64 += encodings[a] + encodings[b] + encodings[c] + '=';
        }
        
        return base64;
    },
    /**
    * Adapted from https://stackoverflow.com/a/53187807
    * Returns the index of the last element in the array where predicate is true, and -1
    * otherwise.
    * @template T
    * @param {Array<T>} array The source array to search in
    * @param {(value: T, index: number, obj: T[]) => boolean} predicate find calls predicate once for each element of the array, in descending
    * order, until it finds one where predicate returns true. If such an element is found,
    * findLastIndex immediately returns that element index. Otherwise, findLastIndex returns -1.
    */
    findLastIndex: (array, predicate) => {
        let l = array.length;
        while (l--) {
            if (predicate(array[l], l, array))
                return l;
        }
        return -1;
    },
    /**
     * Currently does not support --long flags. Assumes string is lowercase ~~and has been trimmed to the first flag point~~.
     * @param {string} strong
     * @returns {[string, string][]}
     */
    flaginator: (strong) => {
        const index = strong.indexOf("-");

        if (index === -1) return [];

        const str = strong.slice(index);

        const strPlit = str.slice(1).split("-");

        let flags = [];

        for (let i = 0; i < strPlit.length; i++) {
            let strPlit2 = strPlit[i].trim().split(" ");

            const name = strPlit2[0];
            const val = strPlit2.slice(1).join(" ").trim();

            flags.push([name, val]);
        }

        return flags;
    }
}