/**
 * @file requestCard.js
 * @description Creates a request card element for displaying request information.
 * This component is used in the results page to show individual requests.
 */

export function createRequestCard(data) {
  const li = document.createElement("li");
  li.dataset.requestId = String(data.id || "");
  li.className = "card card--request";
  
  // Ensures a placeholder image is used if the URL is missing or broken
  const fallback = new URL("../../images/placeholder.jpeg", import.meta.url).href;

  const img = document.createElement("img");
  img.className = "card__img";
  img.src = data.image || fallback;
  img.alt = data.imageAlt || "Request image";

  
  img.loading = "lazy";
  img.decoding = "async";

  // If the image fails to load (404), switch to the fallback immediately
  img.onerror = () => { img.src = fallback; };

  const fit = data.imageFit || "contain";
  img.dataset.fit = fit;


  const body = document.createElement("div");
  body.className = "card__body";

  const meta = document.createElement("p");
  meta.className = "card__meta";
  meta.textContent = `${data.region} • ${data.nameType}`;

  const title = document.createElement("h3");
  title.className = "card__title";
  title.textContent = data.helpType;

  const tags = document.createElement("p");
  tags.className = "card__tags";
  tags.textContent = `Field: ${data.field} • ${data.displayName}`;

  const desc = document.createElement("p");
  desc.className = "card__desc";
  desc.textContent = data.shortDesc || "";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn card__btn";
  btn.textContent = "More details";
  btn.dataset.action = "details";
  
  // Assemble the card
  body.append(meta, title, tags, desc, btn);
  li.append(img, body);
  return li;
}