import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root")!);

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}

const main_page = (
  <div>
    <Section title="Safari Tools">
      <a className="link block" onClick={() => load_page(open_html_page)}>
        OpenHTML
      </a>
    </Section>
    <Section title="iOS And iPadOS Tools">
      <a className="link block" href="/tools/goodnotes_file_converter">
        GoodNotes File Converter
      </a>
    </Section>
  </div>
);

const open_html_page = (
  <div>
    <Section title="OpenHTML">
      <blockquote>
        OpenHTML is a small Website to break the Safari "Sandbox" and open <code>html</code> files with <code>css</code> and <code>js</code> on iOS or iPadOS.
      </blockquote>

      <p>
        <strong>Currently, only V1 and V2 work, and only V1 supports touch devices.</strong>
      </p>
      <a href="/open_html/v1" className="link block">
        OpenHTML V1
      </a>
      <a href="/open_html/v2" className="link block">
        OpenHTML V2
      </a>
      <a href="/open_html/v3" className="link block">
        OpenHTML V3
      </a>
    </Section>
  </div>
);

function load_page(page: React.ReactNode) {
  root.render(
    <>
      {page}
      <button
        className="btn mt-10"
        onClick={() => {
          load_page(main_page);
        }}
      >
        Home
      </button>
    </>
  );
}
let siteToLoad = "";
const attributes = location.href.split("?");
attributes.shift();
console.log(attributes);
for (const attribute in attributes) {
  const a = attributes[attribute].split("=");
  console.log(a);
  if (a[0] == "site") {
    siteToLoad = a[1];
  }
}
if (siteToLoad == "open_html") {
  load_page(open_html_page);
} else {
  load_page(main_page);
}
