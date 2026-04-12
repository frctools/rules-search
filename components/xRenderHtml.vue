<script lang="ts">
export default {
  props: ["html"],
  async setup(props) {
    const { parse } = import.meta.server
      ? await import("dom-parse/dist/node.js")
      : await import("dom-parse/dist/browser.js");

    const Tooltip = resolveComponent("Tooltip");
    let html = `<div class="prose max-w-full dark:prose-invert overflow-x-auto px-4">${props.html}</div>`;

    const doc = parse(html);

    function processNode(node) {
      if (node.nodeType === 3) {
        const text = node.textContent;
        return text ? () => text : null;
      }

      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();

        const props = {};
      
        Array.from(node.attributes).forEach((attr) => {
          props[attr.name] = attr.value;
        });
        

        const children = Array.from(node.childNodes)
          .map(processNode)
          .filter(Boolean);
        return () =>
          h(
            tag == "tooltip" ? Tooltip : tag,
            props,
            tag == 'tooltip' ? {default:()=> node.textContent} :children.map((child) => child())
          );
      }

      return null;
    }

    return processNode(doc.children[0]);
  },
};
</script>
