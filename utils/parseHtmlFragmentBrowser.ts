export function parseHtmlFragmentBrowser(html: string | null | undefined): DocumentFragment {
  const element = document.createElement("template");

  if (html !== null && html !== undefined) {
    element.innerHTML = html;
  }

  return element.content;
}
