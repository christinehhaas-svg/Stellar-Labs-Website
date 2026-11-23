/** Add FAQs to the existing footer menu without changing the storefront layout. */
export function ensureFaqFooterLink(doc: Document) {
  const footer = doc.querySelector("footer");
  if (!footer) return;
  if ([...footer.querySelectorAll("a")].some(link => /^FAQs?$/i.test(link.textContent?.trim() ?? ""))) return;
  const contact = [...footer.querySelectorAll<HTMLAnchorElement>("a")]
    .find(link => /^Contact Us$/i.test(link.textContent?.trim() ?? ""));
  const link = contact?.cloneNode(false) as HTMLAnchorElement | undefined ?? doc.createElement("a");
  link.removeAttribute("id");
  link.removeAttribute("aria-label");
  link.textContent = "FAQs";
  link.href = "/faqs";
  if (contact?.parentElement?.tagName === "LI") {
    const item = contact.parentElement.cloneNode(false) as HTMLElement;
    item.removeAttribute("id");
    item.append(link);
    contact.parentElement.after(item);
  } else if (contact) contact.after(link);
  else footer.append(link);
}
