const yen = new Intl.NumberFormat("ja-JP");

const eventsElement = document.querySelector("#events");
const memberHead = document.querySelector("#member-head");
const memberBody = document.querySelector("#member-body");
const groupHead = document.querySelector("#group-head");
const groupBody = document.querySelector("#group-body");
const errorElement = document.querySelector("#error");
const resultCard = document.querySelector("#result-card");

let nextEventId = 1;
let nextMemberId = 1;
let latestResult = null;

const events = [];
const members = [];
const groupFixedAmounts = {};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addEvent(name) {
  const id = String(nextEventId++);

  events.push({
    id,
    name: name || `${events.length + 1}次会`,
    total: "",
    gap: "1000",
  });

  members.forEach((member) => {
    member.participation[id] = true;
    member.fixed[id] = "";
  });

  renderAll();
}

function removeEvent(id) {
  if (events.length === 1) return;

  const index = events.findIndex((event) => event.id === id);
  events.splice(index, 1);

  members.forEach((member) => {
    delete member.participation[id];
    delete member.fixed[id];
  });

  renderAll();
}

function addMember(name = "") {
  const participation = {};
  const fixed = {};

  events.forEach((event) => {
    participation[event.id] = true;
    fixed[event.id] = "";
  });

  members.push({
    id: nextMemberId++,
    name,
    group: "1",
    participation,
    fixed,
  });

  renderMembers();
  renderGroups();
}

function removeMember(id) {
  if (members.length === 1) return;

  const index = members.findIndex((member) => member.id === id);
  members.splice(index, 1);

  renderMembers();
  renderGroups();
}

function renderEvents() {
  eventsElement.replaceChildren();

  events.forEach((event) => {
    const row = document.createElement("div");
    row.className = "event-row";

    row.innerHTML = `
      <label>
        <span class="field-label">会の名前</span>
        <input class="event-name" value="${escapeHtml(event.name)}">
      </label>

      <label>
        <span class="field-label">合計金額</span>
        <span class="input-with-unit">
          <input class="event-total" type="number" min="1"
            inputmode="numeric" placeholder="12000"
            value="${escapeHtml(event.total)}">
          <b>円</b>
        </span>
      </label>

      <label>
        <span class="field-label">順位ごとの金額差</span>
        <span class="input-with-unit">
          <input class="event-gap" type="number" min="0"
            inputmode="numeric" value="${escapeHtml(event.gap)}">
          <b>円</b>
        </span>
      </label>

      <button class="remove-button" type="button"
        aria-label="会を削除" ${events.length === 1 ? "disabled" : ""}>
        ×
      </button>
    `;

    row.querySelector(".event-name").addEventListener("input", (e) => {
      event.name = e.target.value;
    });

    row.querySelector(".event-name").addEventListener("change", () => {
      renderMembers();
      renderGroups();
    });

    row.querySelector(".event-total").addEventListener("input", (e) => {
      event.total = e.target.value;
    });

    row.querySelector(".event-gap").addEventListener("input", (e) => {
      event.gap = e.target.value;
    });

    row.querySelector(".remove-button").addEventListener("click", () => {
      removeEvent(event.id);
    });

    eventsElement.append(row);
  });
}

function renderMembers() {
  memberHead.innerHTML = `
    <tr>
      <th class="name-cell">名前</th>
      <th class="group-cell">グループ</th>
      ${events
        .map(
          (event) =>
            `<th class="event-cell">${escapeHtml(event.name)}</th>`
        )
        .join("")}
      <th class="delete-cell"></th>
    </tr>
  `;

  memberBody.replaceChildren();

  members.forEach((member) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.className = "name-cell";
    nameCell.innerHTML = `
      <input class="member-name" value="${escapeHtml(member.name)}"
        placeholder="参加者名">
    `;

    nameCell.querySelector("input").addEventListener("input", (e) => {
      member.name = e.target.value;
    });

    const groupCell = document.createElement("td");
    groupCell.className = "group-cell";
    groupCell.innerHTML = `
      <input class="member-group" type="number" min="1"
        inputmode="numeric" value="${escapeHtml(member.group)}">
    `;

    groupCell.querySelector("input").addEventListener("input", (e) => {
      member.group = e.target.value;
    });

    groupCell.querySelector("input").addEventListener("change", () => {
      renderGroups();
    });

    row.append(nameCell, groupCell);

    events.forEach((event) => {
      const cell = document.createElement("td");
      cell.className = "event-cell";

      const setting = document.createElement("div");
      setting.className = "event-setting";

      const participationLabel = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = member.participation[event.id];

      checkbox.addEventListener("change", () => {
        member.participation[event.id] = checkbox.checked;
      });

      participationLabel.append(
        checkbox,
        document.createTextNode("参加")
      );

      const fixedInput = document.createElement("input");
      fixedInput.className = "fixed-input";
      fixedInput.type = "number";
      fixedInput.min = "0";
      fixedInput.inputMode = "numeric";
      fixedInput.placeholder = "個人固定額（任意）";
      fixedInput.value = member.fixed[event.id] || "";

      fixedInput.addEventListener("input", (e) => {
        member.fixed[event.id] = e.target.value;
      });

      setting.append(participationLabel, fixedInput);
      cell.append(setting);
      row.append(cell);
    });

    const deleteCell = document.createElement("td");
    deleteCell.className = "delete-cell";

    const button = document.createElement("button");
    button.className = "remove-button";
    button.type = "button";
    button.textContent = "×";
    button.disabled = members.length === 1;
    button.setAttribute("aria-label", "参加者を削除");

    button.addEventListener("click", () => {
      removeMember(member.id);
    });

    deleteCell.append(button);
    row.append(deleteCell);
    memberBody.append(row);
  });

  document.querySelector("#member-count").textContent =
    `${members.length}人`;
}

function getGroups() {
  return [...new Set(
    members
      .map((member) => Number(member.group))
      .filter((group) => Number.isInteger(group) && group > 0)
  )].sort((a, b) => a - b);
}

function renderGroups() {
  const groups = getGroups();

  groupHead.innerHTML = `
    <tr>
      <th>グループ</th>
      ${events
        .map((event) => `<th>${escapeHtml(event.name)}</th>`)
        .join("")}
    </tr>
  `;

  groupBody.replaceChildren();

  groups.forEach((group) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = `グループ ${group}`;
    row.append(nameCell);

    events.forEach((event) => {
      const key = `${group}:${event.id}`;
      const cell = document.createElement("td");
      const input = document.createElement("input");

      input.className = "fixed-input";
      input.type = "number";
      input.min = "0";
      input.inputMode = "numeric";
      input.placeholder = "自動";
      input.value = groupFixedAmounts[key] || "";

      input.addEventListener("input", (e) => {
        groupFixedAmounts[key] = e.target.value;
      });

      cell.append(input);
      row.append(cell);
    });

    groupBody.append(row);
  });
}

function renderAll() {
  renderEvents();
  renderMembers();
  renderGroups();
}

function parseOptionalAmount(value, label) {
  if (value === "" || value === undefined) return null;

  const amount = Number(value);

  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`${label}は0円以上の整数で入力してください。`);
  }

  return amount;
}

function calculateEvent(event, memberList) {
  const total = Number(event.total);
  const gap = Number(event.gap);

  if (!Number.isInteger(total) || total <= 0) {
    throw new Error(`${event.name}の合計金額を入力してください。`);
  }

  if (!Number.isInteger(gap) || gap < 0) {
    throw new Error(`${event.name}の金額差を正しく入力してください。`);
  }

  const participants = memberList.filter(
    (member) => member.participation[event.id]
  );

  if (participants.length === 0) {
    throw new Error(`${event.name}の参加者を選択してください。`);
  }

  const allocations = [];
  const automatic = [];
  let manualTotal = 0;

  participants.forEach((member) => {
    const individualFixed = parseOptionalAmount(
      member.fixed[event.id],
      `${member.name}の固定額`
    );

    const group = Number(member.group);

    if (!Number.isInteger(group) || group <= 0) {
      throw new Error(`${member.name}のグループ番号を確認してください。`);
    }

    const groupFixed = parseOptionalAmount(
      groupFixedAmounts[`${group}:${event.id}`],
      `グループ${group}の固定額`
    );

    const fixed =
      individualFixed !== null ? individualFixed : groupFixed;

    if (fixed !== null) {
      allocations.push({
        memberId: member.id,
        amount: fixed,
      });
      manualTotal += fixed;
    } else {
      automatic.push({
        memberId: member.id,
        group,
      });
    }
  });

  if (manualTotal > total) {
    throw new Error(`${event.name}の固定額が合計金額を超えています。`);
  }

  const remaining = total - manualTotal;

  if (automatic.length === 0) {
    if (remaining !== 0) {
      throw new Error(
        `${event.name}は全員固定額のため、合計が一致していません。`
      );
    }

    return allocations;
  }

  const automaticGroups = [
    ...new Set(automatic.map((person) => person.group)),
  ].sort((a, b) => a - b);

  const groupRank = new Map(
    automaticGroups.map((group, index) => [group, index])
  );

  const maxRank = automaticGroups.length - 1;

  const offsetTotal = automatic.reduce((sum, person) => {
    const rank = groupRank.get(person.group);
    return sum + (maxRank - rank) * gap;
  }, 0);

  const base = (remaining - offsetTotal) / automatic.length;

  if (base < 0) {
    throw new Error(
      `${event.name}は金額差が大きすぎます。固定額または金額差を下げてください。`
    );
  }

  const automaticAmounts = automatic.map((person) => {
    const rank = groupRank.get(person.group);
    const exact = base + (maxRank - rank) * gap;

    return {
      ...person,
      exact,
      amount: Math.floor(exact),
    };
  });

  let adjustment =
    remaining -
    automaticAmounts.reduce((sum, person) => sum + person.amount, 0);

  const adjustmentOrder = [...automaticAmounts].sort((a, b) => {
    const fractionA = a.exact - Math.floor(a.exact);
    const fractionB = b.exact - Math.floor(b.exact);

    return fractionB - fractionA || a.group - b.group;
  });

  for (let index = 0; index < adjustment; index += 1) {
    adjustmentOrder[index % adjustmentOrder.length].amount += 1;
  }

  automaticAmounts.forEach((person) => {
    allocations.push({
      memberId: person.memberId,
      amount: person.amount,
    });
  });

  return allocations;
}

function calculate() {
  const namedMembers = members.map((member, index) => ({
    ...member,
    name: member.name.trim() || `参加者${index + 1}`,
  }));

  const eventResults = events.map((event) => ({
    ...event,
    total: Number(event.total),
    allocations: calculateEvent(event, namedMembers),
  }));

  const people = namedMembers.map((member) => {
    const breakdown = eventResults.map((event) => {
      const allocation = event.allocations.find(
        (item) => item.memberId === member.id
      );

      return {
        eventName: event.name,
        amount: allocation ? allocation.amount : null,
      };
    });

    return {
      id: member.id,
      name: member.name,
      breakdown,
      total: breakdown.reduce(
        (sum, item) => sum + (item.amount ?? 0),
        0
      ),
    };
  });

  return { events: eventResults, people };
}

function showResult(result) {
  document.querySelector("#result-head").innerHTML = `
    <tr>
      <th>名前</th>
      ${result.events
        .map((event) => `<th>${escapeHtml(event.name)}</th>`)
        .join("")}
      <th>個人合計</th>
    </tr>
  `;

  const body = document.querySelector("#result-body");
  body.replaceChildren();

  result.people.forEach((person) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(person.name)}</td>
      ${person.breakdown
        .map((item) =>
          item.amount === null
            ? `<td class="not-attending">不参加</td>`
            : `<td>${yen.format(item.amount)}円</td>`
        )
        .join("")}
      <td class="person-total">${yen.format(person.total)}円</td>
    `;

    body.append(row);
  });

  const grandTotal = result.events.reduce(
    (sum, event) => sum + event.total,
    0
  );

  document.querySelector("#result-foot").innerHTML = `
    <tr>
      <td>会計合計</td>
      ${result.events
        .map((event) => `<td>${yen.format(event.total)}円</td>`)
        .join("")}
      <td>${yen.format(grandTotal)}円</td>
    </tr>
  `;

  resultCard.hidden = false;
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildCopyText(result) {
  const lines = ["【傾斜割り勘】", ""];

  result.events.forEach((event) => {
    lines.push(`■ ${event.name}`);

    event.allocations.forEach((allocation) => {
      const person = result.people.find(
        (item) => item.id === allocation.memberId
      );

      lines.push(`${person.name}：${yen.format(allocation.amount)}円`);
    });

    lines.push(`合計：${yen.format(event.total)}円`, "");
  });

  lines.push("【個人合計】");

  result.people.forEach((person) => {
    lines.push(`${person.name}：${yen.format(person.total)}円`);
  });

  return lines.join("\n");
}

document.querySelector("#add-event").addEventListener("click", () => {
  addEvent();
});

document.querySelector("#add-member").addEventListener("click", () => {
  addMember();
});

document.querySelector("#calculate").addEventListener("click", () => {
  errorElement.textContent = "";

  try {
    latestResult = calculate();
    showResult(latestResult);
  } catch (error) {
    resultCard.hidden = true;
    errorElement.textContent = error.message;
  }
});

document.querySelector("#copy-result").addEventListener("click", async () => {
  const status = document.querySelector("#copy-status");
  const text = buildCopyText(latestResult);

  try {
    await navigator.clipboard.writeText(text);
    status.textContent = "コピーしました！";
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();

    const copied = document.execCommand("copy");
    area.remove();

    status.textContent = copied
      ? "コピーしました！"
      : "コピーできませんでした。";
  }
});

addEvent("1次会");
addEvent("2次会");

addMember("幹事");
addMember();
addMember();