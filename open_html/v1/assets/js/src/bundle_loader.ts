import * as zip from "@zip.js/zip.js";
import * as css_lib from "css";

import { version } from "./constants";

const LIMIT_OF_THE_SAME_FILE = 30;

interface BundleLoadResult {
    entrypoint: string;
    allowDevtools: boolean;
    mismatchedVersion: boolean;
}

const linkPropertyTable = {
    link: "href",
    img: "src",
    script: "src",
    iframe: "src",
    a: "href",
    audio: "src",
    video: "src",
};
class Path extends String {
    cd(path: string): Path {
        let inDirectory = this.endsWith("/");
        const pathParts = path.split("/");
        const cdPath = path.split("/");

        if (inDirectory) {
            // Remove the last empty string
            cdPath.pop();
        }

        let newPath: string[] = [];

        if (cdPath[0] != "") {
            newPath = this.split("/");
        }

        for (const part of pathParts) {
            if (part === ".." && newPath.length > 0) {
                newPath.pop();
            } else if (part === ".") {
                inDirectory = true;
            } else {
                if (!inDirectory) {
                    newPath.pop();
                }

                newPath.push(part);

                inDirectory = true;
            }
        }

        const newPathStr = newPath.join("/");

        if (path.endsWith("/")) {
            return new Path(newPathStr + "/");
        }

        return new Path(newPathStr);
    }
}
interface CursedFiles {
    [key: string]: number | undefined;
}
let cursedFiles: CursedFiles = {};
const importStatement = "import";
async function replaceJSRefs(
    txt: string,
    entries: zip.Entry[],
    path: Path
): Promise<string> {
    //Jump Comments
    for (let i = 0; i < txt.length; ++i) {
        if (txt.at(i) == "/" && txt.at(i + 1) == "/")
            while (i < txt.length) {
                i++;
                if (txt.at(i) == "\n") break;
            }
        if (txt.at(i) == "/" && txt.at(i + 1) == "*")
            while (i < txt.length) {
                i++;
                if (txt.at(i - 1) == "*" && txt.at(i) == "/") break;
            }
        //Jump Strings
        if (txt.at(i) == '"' || txt.at(i) == "'" || txt.at(i) == "`") {
            let strEnd = "";
            strEnd = txt.at(i)!;
            while (i < txt.length) {
                i++;
                if (
                    txt.at(i) == strEnd &&
                    (txt.at(i - 1) == "\\" ? txt.at(i - 2) == "\\" : true)
                )
                    break;
            }
        }
        // If txt[i] == "i" it could be import + Later @ support!
        if (txt.at(i) == "i" /*|| txt.at(i) == "@"*/) {
            // string of length is import
            const x = txt.substring(i, importStatement.length + i);
            // is import
            if (x === importStatement || txt.at(i) == "@") {
                let atI = i;
                let isAt = txt.at(i) == "@";
                // find Path String
                let currEndChar;
                while (i < txt.length) {
                    i++;
                    if (
                        txt.at(i) == '"' ||
                        txt.at(i) == "'" ||
                        txt.at(i) == "`"
                    ) {
                        currEndChar = txt.at(i);
                        break;
                    }
                }
                // Get URL String
                let j = i;
                while (j < txt.length) {
                    j++;
                    if (
                        currEndChar === txt.at(j) &&
                        (txt.at(j - 1) == "\\" ? txt.at(j - 2) == "\\" : true)
                    ) {
                        const curl = txt.slice(i + 1, j);

                        let pathFolder = path.cd("..");
                        const nwurl = await resolveURL(
                            curl,
                            entries,
                            pathFolder
                        );
                        if (isAt) {
                            txt = txt.slice(0, atI) + txt.slice(atI + 1);
                        }
                        // Insert string at Position
                        txt = txt.slice(0, i + 1) + nwurl + txt.slice(j);
                        i = i + nwurl.length;
                        break;
                    }
                }
            }
        }
    }

    return txt;
}

async function replaceJSFile(
    blob: Blob,
    path: Path,
    entries: zip.Entry[]
): Promise<Blob> {
    const res: Blob = await new Promise((resolve, reject) => {
        let fr = new FileReader();
        fr.onload = async (e: ProgressEvent<FileReader>) => {
            let txt = e.target!.result;
            txt = await replaceJSRefs(txt as string, entries, path);
            const rt = new Blob([txt as BlobPart], {
                type: "text/javascript",
            });
            resolve(rt);
        };
        fr.onerror = (e) => {
            reject(new Blob([]));
        };
        fr.readAsText(blob);
    });
    return res;
}

async function replaceHTMLFile(
    blob: Blob,
    path: Path,
    entries: zip.Entry[]
): Promise<Blob> {
    const res: Blob = await new Promise((resolve, reject) => {
        let fr = new FileReader();
        fr.onload = async (e: ProgressEvent<FileReader>) => {
            let txt = e.target!.result;
            txt = await replaceRefs(txt as string, entries, "/");
            const rt = new Blob([txt as BlobPart], {
                type: "text/html",
            });
            resolve(rt);
        };
        fr.onerror = (e) => {
            console.error("replaceHTMLFile", e);
            reject(new Blob([]));
        };
        fr.readAsText(blob);
    });
    return res;
}

let splitURL = window.location.pathname;
if (splitURL.endsWith("/")) {
    splitURL = splitURL.substring(0, splitURL.length - 1);
}
function resolveURL(
    txt: string,
    entries: zip.Entry[],
    path: Path
): Promise<string> {
    return new Promise(async (resolve, reject) => {
        let txtArr = txt.split(splitURL);
        if (txtArr.length == 1) {
            txt = txtArr[0];
        } else {
            txt = txtArr[1];
        }
        const filePath = path.cd(txt);
        if (cursedFiles[filePath.toString()] === undefined) {
            cursedFiles[filePath.toString()] = 1;
        } else {
            const a: number = cursedFiles[filePath.toString()]!;
            cursedFiles[filePath.toString()] = a + 1;
            if (a >= LIMIT_OF_THE_SAME_FILE) {
                console.log("Usage of Files: ", cursedFiles);
                alert(
                    `You have used to many recursions with file: ${filePath.toString()}!\n Please contact the package creator!`
                );
                location.reload();
            }
        }
        let file = entries.find((a) => {
            const b = "/" + a.filename;
            return b == filePath.toString();
        });
        let currBlob = await file!.getData!(new zip.BlobWriter());
        if (filePath.endsWith(".js")) {
            currBlob = await replaceJSFile(currBlob, filePath, entries);
        } else if (filePath.endsWith(".css")) {
            currBlob = await parse_css(currBlob, filePath, entries);
        } else if (filePath.endsWith(".html")) {
            currBlob = await replaceHTMLFile(currBlob, filePath, entries);
        }
        resolve(URL.createObjectURL(currBlob));
    });
}
async function replaceRefs(
    txt: string,
    entries: zip.Entry[],
    path: string = "."
): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(txt, "text/html");
    for (const [tagName, property] of Object.entries(linkPropertyTable)) {
        const queriedElements = doc.getElementsByTagName(tagName);
        for (const element of queriedElements) {
            if (element.hasAttribute(property)) {
                //@ts-ignore
                element[property] = await resolveURL(
                    //@ts-ignore
                    element[property],
                    entries,
                    new Path(path)
                );
            }
        }
    }

    const serializer = new XMLSerializer();
    const rt = serializer.serializeToString(doc);
    return rt;
}

export async function load_bundle(
    bundle: File
): Promise<BundleLoadResult | null> {
    console.info("Loading bundle...");
    const zip_reader = new zip.ZipReader(new zip.BlobReader(bundle));
    const entries = await zip_reader.getEntries();

    let entrypoint = "index.html";
    let allowDevtools = true;
    let mismatchedVersion = true;

    const metaFile = entries.find((entry) => entry.filename === "meta.json")!;
    if (metaFile) {
        console.debug("Parsing meta.json file...");
        const meta = JSON.parse(await metaFile.getData!(new zip.TextWriter()));

        if (meta.entrypoint) {
            entrypoint = meta.entrypoint;
        }

        if (meta.allowDevtools === false) {
            console.debug("Devtools are disabled.");
            allowDevtools = false;
        }

        if (meta.version === version) {
            mismatchedVersion = false;
        } else {
            console.debug(
                "The bundle was built with a different version of open_html."
            );
        }
    } else {
        console.debug("The bundle does not contain a meta.json file.");
    }

    const entrypointFile = entries.find(
        (entry) => entry.filename === entrypoint
    )!;
    if (!entrypointFile) {
        console.error("The bundle does not contain the entrypoint file.");
        alert("The bundle does not contain the entrypoint file.");

        return null;
    }
    const entrypointDataUrl = await entrypointFile.getData!(
        new zip.BlobWriter("text/html")
    );

    const res: Blob = await new Promise((resolve, reject) => {
        let fr = new FileReader();
        fr.onload = async (e: ProgressEvent<FileReader>) => {
            let txt = e.target!.result;
            txt = await replaceRefs(txt as string, entries, "/");
            const rt = new Blob([txt as BlobPart], {
                type: "text/html",
            });

            console.debug("Bundle loaded.");
            console.timeEnd("parseBundle");
            resolve(rt);
        };
        fr.onerror = (e) => {
            console.error("Error parsing bundle", e);
            reject(new Blob([]));
        };

        console.debug("Loading bundle...");
        console.time("parseBundle");
        fr.readAsText(entrypointDataUrl);
    });

    const uri = URL.createObjectURL(res);

    return {
        entrypoint: uri,
        allowDevtools,
        mismatchedVersion,
    };
}

export function parse_css(
    css: Blob,
    path: Path,
    entries: zip.Entry[]
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = async (e: ProgressEvent<FileReader>) => {
            let css_parsed = css_lib.parse(e.target!.result as string);

            // Iterate over every url() in the CSS file and replace it with the resolved URL
            for (const rule of css_parsed.stylesheet!.rules) {
                if (rule.type == "import") {
                    // @ts-ignore
                    const url = rule.import!;
                    if (!url.startsWith("url(")) continue;

                    // Remove the url() wrapper
                    let pure_url = url.substring(4, url.length - 1);
                    // Remove the quotes if they exist
                    if (pure_url.startsWith('"') || pure_url.startsWith("'")) {
                        pure_url = pure_url.substring(1, pure_url.length - 1);
                    }

                    const resolvedURL = await resolveURL(
                        pure_url,
                        entries,
                        path
                    );

                    // @ts-ignore
                    rule.import = 'url("' + resolvedURL + '")';
                }
            }

            resolve(
                new Blob([css_lib.stringify(css_parsed)], { type: "text/css" })
            );
        };
        fr.onerror = reject;

        fr.readAsText(css);
    });
}
