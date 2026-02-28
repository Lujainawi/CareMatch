/**
 * @file requestCard.js
 * @description Creates a request card element for displaying request information.
 * This component is used in the results page to show individual requests.
 */

export function createRequestCard(data) {
  const li = document.createElement("li");
  li.className = "card card--request";
  li.dataset.requestId = String(data.id || "");
  
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

  // Actions row
  const actions = document.createElement("div");
  actions.className = "card__actions";

  // Status badge (Open / Pending / Closed) – show first
  if (data.status) {
    const st = document.createElement("span");
    st.className = "status-badge";
  
    if (data.status === "in_progress") {
      st.textContent = "Pending";
      st.classList.add("status-badge--pending");
    } else if (data.status === "closed") {
      st.textContent = "Closed";
      st.classList.add("status-badge--closed");
    } else {
      st.textContent = "Open";
      st.classList.add("status-badge--open");
    }
  
    actions.prepend(st);
  }

  // More details – only for NOT mine (Results page)
  if (!data.isMine) {
    const detailsBtn = document.createElement("button");
    detailsBtn.type = "button";
    detailsBtn.className = "btn card__btn";
    detailsBtn.textContent = "More details";
    detailsBtn.dataset.action = "details";
    actions.appendChild(detailsBtn);
  }

  // Delete only for My Requests
  if (data.canDelete) {
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "chip-btn chip-btn--danger";
    delBtn.textContent = "Delete";
    delBtn.dataset.action = "delete";
    actions.appendChild(delBtn);
  }

  // Accept/Reject only for owner when pending
  if (data.canManage && data.status === "in_progress") {
    const acceptBtn = document.createElement("button");
    acceptBtn.type = "button";
    acceptBtn.className = "btn btn-primary";
    acceptBtn.textContent = "Accept";
    acceptBtn.dataset.action = "accept";
    actions.appendChild(acceptBtn);

    const rejectBtn = document.createElement("button");
    rejectBtn.type = "button";
    rejectBtn.className = "btn btn-ghost";
    rejectBtn.textContent = "Reject";
    rejectBtn.dataset.action = "reject";
    actions.appendChild(rejectBtn);
  }

  // Assemble the card
  body.append(meta, title, tags, desc, actions);
  li.append(img, body);
  return li;
}