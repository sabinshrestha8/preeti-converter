# Third-party notices

## Conversion engine

`lib/converter/` is a JavaScript port of two Python projects by Global Policy:

- PreetiToUnicode — https://github.com/globalpolicy/PreetiToUnicode
- UnicodeToPreeti — https://github.com/globalpolicy/UnicodeToPreeti

The port has been modified; see `docs/conversion-engine.md` and `CHANGELOG.md`.
Both projects are distributed under the following license (identical text in
each repository, retrieved 2026-10-17):

```
MIT License

Copyright (c) 2017 Global Policy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Runtime dependencies shipped to the browser

Their license texts are in `node_modules/<package>/LICENSE*`.

| Package | License |
|---|---|
| next, react, react-dom | MIT |
| jszip | MIT or GPL-3.0 (dual; used under MIT) |
| @xmldom/xmldom | MIT |
