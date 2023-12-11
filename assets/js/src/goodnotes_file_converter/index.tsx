import { createRoot } from "react-dom/client";
import * as zip from "@zip.js/zip.js";

const root = createRoot(document.getElementById("root")!);

const on_file_change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const data = reader.result as ArrayBuffer;

        const zip_reader = new zip.ZipReader(
            new zip.BlobReader(new Blob([data]))
        );
        console.log(zip_reader.getEntries());
    };
    reader.readAsArrayBuffer(file);
};

root.render(
    <>
        <p>Select your GoodNotes file</p>
        <input
            onChange={on_file_change}
            type="file"
            className="file-input file-input-bordered"
            accept=".goodnotes"
        />
    </>
);
