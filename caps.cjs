const p = 'C:\\Users\\mt\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe';
console.log('WIN', p);
console.log('POSIX', require('path').posix.resolve(p));
console.log('FILE', require('fs').existsSync(p));
