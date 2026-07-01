const eventsElement = document.querySelector("#events");
const eventTemplate = document.querySelector("#event-template");
const memberTableHead = document.querySelector("#member-table-head");
const memberTableBody = document.querySelector("#member-table-body");
const errorElement = document.querySelector("#error");
const resultCard = document.querySelector("#result-card");

const yen = new Intl.NumberFormat("ja-JP");

let nextEventId = 1;
let nextMemberId = 1;
let latestResult = null;

function getEvents() {
  return [...eventsElement.querySelectorAll(".event-row")].map(
    (row, index) => ({
      id: row.dataset.eventId,
      name:
        row.querySelector(".event-name").value.trim() ||
        `${index + 1}次会`,
      total: Number(row.querySelector(".event-total").value),
      row,
    })
  );
}

function updateEventButtons() {
  const count = eventsElement.children.length;

  eventsElement.querySelectorAll(".remove-event").forEach((button) => {
    button.disabled = count === 1;
  });
}

function updateMemberButtons() {
  const count = memberTableBody.children.length;

  document.querySelector("#member-count").textContent = `${count}人`;

  memberTableBody.querySelectorAll(".remove-member").forEach((button) => {
    button.disabled = count === 1;
  });
}

function syncMemberTable() {
  const events = getEvents();

  const headerRow = document.createElement("tr");

  headerRow.innerHTML = `
    <th class="name-column">名前</th>
    <th class="weight-column">負担度</th>
    ${events
      .map(
        (event) =>
          `<th class="event-column">${escapeHtml(event.name)}</th>`
      )
      .join("")}
    <th class="delete-column"></th>
  `;

  memberTableHead.replaceChildren(headerRow);

  [...memberTableBody.querySelectorAll("tr")].forEach((row) => {
    const previous = new Map(
      [...row.querySelectorAll(".participation-checkbox")].map(
        (checkbox) => [
          checkbox.dataset.eventId,
          checkbox.checked,
        ]
      )
    );

    row.querySelectorAll(".event-participation-cell").forEach((cell) => {
      cell.remove();
    });

    const deleteCell = row.querySelector(".delete-cell");

    events.forEach((event) => {
      const cell = document.createElement("td");
      cell.className = "event-participation-cell";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "participation-checkbox";
      checkbox.dataset.eventId = event.id;
      checkbox.setAttribute(
        "aria-label",
        `${event.name}に参加`
      );
      checkbox.checked = previous.get(event.id) ?? true;

      cell.append(checkbox);
      row.insertBefore(cell, deleteCell);
    });
  });
}

function addEvent(name, total = "") {
  const row = eventTemplate.content.firstElementChild.cloneNode(true);

  row.dataset.eventId = String(nextEventId++);
  row.querySelector(".event-name").value =
    name || `${eventsElement.children.length + 1}次会`;
  row.querySelector(".event-total").value = total;

  row.querySelector(".event-name").addEventListener(
    "input",
    syncMemberTable
  );

  row.querySelector(".remove-event").addEventListener("click", () => {
    row.remove();
    updateEventButtons();
    syncMemberTable();
  });

  eventsElement.append(row);
  updateEventButtons();
  syncMemberTable();
}

function addMember(name = "") {
  const row = document.createElement("tr");
  row.dataset.memberId = String(nextMemberId++);

  const nameCell = document.createElement("td");
  nameCell.className = "name-column";

  const nameInput = document.createElement("input");
  nameInput.className = "member-name";
  nameInput.type = "text";
  nameInput.maxLength = 30;
  nameInput.placeholder = "参加者名";
  nameInput.value = name;
  nameInput.setAttribute("aria-label", "参加者名");

  nameCell.append(nameInput);

  const weightCell = document.createElement("td");
  weightCell.className = "weight-column";

  const weightSelect = document.createElement("select");
  weightSelect.className = "member-weight";
  weightSelect.setAttribute("aria-label", "負担度");
  weightSelect.innerHTML = `
    <option value="1.2">多め（1.2）</option>
    <option value="1" selected>普通（1.0）</option>
    <option value="0.8">少なめ（0.8）</option>
  `;

  weightCell.append(weightSelect);

  const deleteCell = document.createElement("td");
  deleteCell.className = "delete-cell delete-column";

  const deleteButton = document.createElement("button");
  deleteButton.className = "remove-button remove-member";
  deleteButton.type = "button";
  deleteButton.textContent = "×";
  deleteButton.setAttribute("aria-label", "参加者を削除");

  deleteButton.addEventListener("click", () => {
    row.remove();
    updateMemberButtons();
  });

  deleteCell.append(deleteButton);

  row.append(nameCell, weightCell, deleteCell);
  memberTableBody.append(row);

  syncMemberTable();
  updateMemberButtons();
}

function getMembers() {
  return [...memberTableBody.querySelectorAll("tr")].map(
    (row, index) => ({
      id: index,
      name:
        row.querySelector(".member-name").value.trim() ||
        `参加者${index + 1}`,
      weight: Number(
        row.querySelector(".member-weight").value
      ),
      participatingEventIds: [
        ...row.querySelectorAll(".participation-checkbox:checked"),
      ].map((checkbox) => checkbox.dataset.eventId),
    })
  );
}

function allocateEvent(total, participants) {
  const weightTotal = participants.reduce(
    (sum, participant) => sum + participant.weight,
    0
  );

  const calculated = participants.map((participant) => {
    const exact = (total * participant.weight) / weightTotal;

    return {
      ...participant,
      exact,
      amount: Math.floor(exact),
    };
  });

  let remaining =
    total -
    calculated.reduce(
      (sum, participant) => sum + participant.amount,
      0
    );

  const order = [...calculated].sort((a, b) => {
    const fractionA = a.exact - Math.floor(a.exact);
    const fractionB = b.exact - Math.floor(b.exact);

    return fractionB - fractionA || a.id - b.id;
  });

  for (let index = 0; index < remaining; index += 1) {
    order[index % order.length].amount += 1;
  }

  return calculated.map((participant) => ({
    memberId: participant.id,
    amount: order.find((item) => item.id === participant.id).amount,
  }));
}

function calculate() {
  errorElement.textContent = "";

  const events = getEvents();
  const members = getMembers();

  for (const event of events) {
    if (!Number.isInteger(event.total) || event.total <= 0) {
      errorElement.textContent =
        `${event.name}の合計金額を入力してください。`;
      event.row.querySelector(".event-total").focus();
      return null;
    }
  }

  const eventResults = [];

  for (const event of events) {
    const participants = members.filter((member) =>
      member.participatingEventIds.includes(event.id)
    );

    if (participants.length === 0) {
      errorElement.textContent =
        `${event.name}の参加者を1人以上選択してください。`;
      return null;
    }

    eventResults.push({
      id: event.id,
      name: event.name,
      total: event.total,
      allocations: allocateEvent(event.total, participants),
    });
  }

  const people = members.map((member) => {
    const breakdown = eventResults.map((event) => {
      const allocation = event.allocations.find(
        (item) => item.memberId === member.id
      );

      return {
        eventId: event.id,
        eventName: event.name,
        amount: allocation ? allocation.amount : null,
      };
    });

    return {
      name: member.name,
      breakdown,
      total: breakdown.reduce(
        (sum, item) => sum + (item.amount ?? 0),
        0
      ),
    };
  });

  return {
    events: eventResults,
    people,
  };
}

function showResult(result) {
  const headRow = document.createElement("tr");

  headRow.innerHTML = `
    <th>名前</th>
    ${result.events
      .map((event) => `<th>${escapeHtml(event.name)}</th>`)
      .join("")}
    <th>個人合計</th>
  `;

  document.querySelector("#result-table-head")
    .replaceChildren(headRow);

  const bodyRows = result.people.map((person) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = person.name;
    row.append(nameCell);

    person.breakdown.forEach((item) => {
      const cell = document.createElement("td");

      if (item.amount === null) {
        cell.textContent = "不参加";
        cell.className = "not-attending";
      } else {
        cell.textContent = `${yen.format(item.amount)}円`;
      }

      row.append(cell);
    });

    const totalCell = document.createElement("td");
    totalCell.className = "person-total";
    totalCell.textContent = `${yen.format(person.total)}円`;
    row.append(totalCell);

    return row;
  });

  document.querySelector("#result-table-body")
    .replaceChildren(...bodyRows);

  const footRow = document.createElement("tr");

  const totalLabel = document.createElement("td");
  totalLabel.textContent = "会計合計";
  footRow.append(totalLabel);

  result.events.forEach((event) => {
    const cell = document.createElement("td");
    cell.textContent = `${yen.format(event.total)}円`;
    footRow.append(cell);
  });

  const grandTotal = result.events.reduce(
    (sum, event) => sum + event.total,
    0
  );

  const grandTotalCell = document.createElement("td");
  grandTotalCell.textContent = `${yen.format(grandTotal)}円`;
  footRow.append(grandTotalCell);

  document.querySelector("#result-table-foot")
    .replaceChildren(footRow);

  document.querySelector("#copy-status").textContent = "";
  resultCard.hidden = false;

  resultCard.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function buildCopyText(result) {
  const lines = ["【傾斜割り勘】", ""];

  result.events.forEach((event) => {
    lines.push(`■ ${event.name}`);

    event.allocations.forEach((allocation) => {
      const person = result.people[allocation.memberId];
      lines.push(
        `${person.name}：${yen.format(allocation.amount)}円`
      );
    });

    lines.push(`合計：${yen.format(event.total)}円`, "");
  });

  lines.push("【個人合計】");

  result.people.forEach((person) => {
    lines.push(`${person.name}：${yen.format(person.total)}円`);
  });

  return lines.join("\n");
}

async function copyResult() {
  const status = document.querySelector("#copy-status");
  const text = buildCopyText(latestResult);

  try {
    await navigator.clipboard.writeText(text);
    status.textContent = "コピーしました！";
  } catch {
    const temporaryArea = document.createElement("textarea");
    temporaryArea.value = text;
    document.body.append(temporaryArea);
    temporaryArea.select();

    const copied = document.execCommand("copy");
    temporaryArea.remove();

    status.textContent = copied
      ? "コピーしました！"
      : "コピーできませんでした。";
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelector("#add-event").addEventListener("click", () => {
  addEvent();
});

document.querySelector("#add-member").addEventListener("click", () => {
  addMember();
});

document.querySelector("#calculate").addEventListener("click", () => {
  const result = calculate();

  if (!result) {
    return;
  }

  latestResult = result;
  showResult(result);
});

document
  .querySelector("#copy-result")
  .addEventListener("click", copyResult);

addEvent("1次会");
addEvent("2次会");

addMember("幹事");
addMember();
addMember();