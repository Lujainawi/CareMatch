export function createRequestCard(data) {
    const li = document.createElement("li");
    li.className = "card card--request";
  
    const img = document.createElement("img");
    img.className = "card__img";
    img.src = data.image || "images/placeholder.jpg";
    img.alt = data.imageAlt || "Request image";
  
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
    tags.textContent = `Field: ${data.field} • By: ${data.displayName}`;
  
    const desc = document.createElement("p");
    desc.className = "card__desc";
    desc.textContent = data.shortDesc;
  
    const btn = document.createElement("a");
    btn.className = "btn card__btn";
    btn.href = data.moreHref || "results.html";
    btn.textContent = "More details";
  
    body.append(meta, title, tags, desc, btn);
    li.append(img, body);
    return li;
  }  