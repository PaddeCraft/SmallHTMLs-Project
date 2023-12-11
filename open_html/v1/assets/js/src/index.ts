import { load_bundle } from "./bundle_loader";

const file_input_e = document.getElementById("fileinput")! as HTMLInputElement;
const iframe1 = document.getElementById("iframe1")! as HTMLIFrameElement;
function change() {
    var files = file_input_e.files!;

    if (files.length === 0) {
        return;
    }
    if (files.length >= 2) {
        return;
    }

    var file = files[0];
    console.debug("File changed", file);

    if (file.name.endsWith(".htpkg") || file.name.endsWith(".htpk")) {
        console.info("Detected bundle file");
        load_bundle(file)
            .then((bundle) => {
                if (bundle === null) {
                    return;
                }

                if (bundle.mismatchedVersion) {
                    alert(
                        "The bundle was built with a different version of open_html. This may cause unexpected behavior."
                    );
                }

                console.debug(
                    "Bundle loaded, displaying now...",
                    bundle.entrypoint
                );
                iframe1.src = bundle.entrypoint;
            })
            .catch((e) => {
                console.error(e);
                alert("Failed to load bundle.");
            });
        return;
    }

    iframe1.src = URL.createObjectURL(file);
}
file_input_e.onchange = change;

console.clear();

console.log(
    "%cOpen HTML",
    "font-size: 3em; font-weight: bold; color: #fccf03;"
);
console.log(
    "%cThis tool is part of the SmallHTMLs project.",
    "font-size: 1.5em; color: #fccf03;"
);
console.log(
    "%cLicensed under the MIT public license. Source: https://github.com/SmallHTMLs/",
    "color: grey;"
);
