const membersElement = document.querySelector("#members");
const template = document.querySelector("#member-template");
const totalInput = document.querySelector("#total");
const errorElement = document.querySelector("#error");
const resultCard = document.querySelector("#result-card");

const yen = new Intl.NumberFormat("ja-JP");

const weightLabels = {
  "1.2": "多め",
  "1": "普通",
  "0.8": "少なめ",
};

let latestResult = [];

function updateMemberCount() {
  const count = membersElement.children.length;

  document.querySelector("#member-count").textContent = `${count}人`;

  membersElement.querySelectorAll(".remove-member").forEach((button) => {
    button.disabled = count === 1;
    button.title = count === 1 ? "参加者は1人以上必要です" : "";
  });
}

function addMember(name = "") {
  const row = template.content.firstElementChild.cloneNode(true);

  row.querySelector(".member-name").value = name;

  row.querySelector(".remove-member").addEventListener("click", () => {
    row.remove();
    updateMemberCount();
  });

  membersElement.append(row);
  updateMemberCount();
}

/**
 * 理論上の負担額を計算し、100円単位で配分する。
 * 合計が100円で割り切れない場合のみ、1人に100円未満の端数を加える。
 */
function calculateShares(total, people) {
  const weightTotal = people.reduce(
    (sum, person) => sum + person.weight,
    0
  );

  const calculated = people.map((person, index) => ({
    ...person,
    index,
    exact: (total * person.weight) / weightTotal,
  }));

  // 一度全員を100円単位で切り捨てる
  const shares = calculated.map(
    (person) => Math.floor(person.exact / 100) * 100
  );

  let remaining =
    total - shares.reduce((sum, amount) => sum + amount, 0);

  // 切り捨てた端数が大きい人から100円ずつ戻す
  const adjustmentOrder = [...calculated].sort((a, b) => {
    const remainderA = a.exact - shares[a.index];
    const remainderB = b.exact - shares[b.index];

    return remainderB - remainderA || a.index - b.index;
  });

  for (const person of adjustmentOrder) {
    if (remaining < 100) {
      break;
    }

    shares[person.index] += 100;
    remaining -= 100;
  }

  // 合計自体に100円未満の端数がある場合
  if (remaining > 0) {
    shares[adjustmentOrder[0].index] += remaining;
  }

  return people.map((person, index) => ({
    ...person,
    amount: shares[index],
  }));
}

function showResult(result, total) {
  const resultsElement = document.querySelector("#results");

  const rows = result.map((person) => {
    const row = document.createElement("div");
    row.className = "result-row";

    const name = document.createElement("span");
    name.textContent = person.name;

    const weight = document.createElement("small");
    weight.textContent = weightLabels[String(person.weight)];
    name.append(weight);

    const amount = document.createElement("strong");
    amount.textContent = `${yen.format(person.amount)}円`;

    row.append(name, amount);
    return row;
  });

  resultsElement.replaceChildren(...rows);

  document.querySelector("#result-total").textContent =
    `${yen.format(total)}円`;

  document.querySelector("#copy-status").textContent = "";
  resultCard.hidden = false;

  resultCard.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

document.querySelector("#add-member").addEventListener("click", () => {
  addMember();
});

document.querySelector("#calculate").addEventListener("click", () => {
  errorElement.textContent = "";

  const total = Number(totalInput.value);

  if (!Number.isInteger(total) || total <= 0) {
    errorElement.textContent =
      "合計金額を1円以上の整数で入力してください。";
    totalInput.focus();
    return;
  }

  const people = [...membersElement.querySelectorAll(".member-row")]
    .map((row, index) => ({
      name:
        row.querySelector(".member-name").value.trim() ||
        `参加者${index + 1}`,
      weight: Number(
        row.querySelector(".member-weight").value
      ),
    }));

  latestResult = calculateShares(total, people);
  showResult(latestResult, total);
});

document.querySelector("#copy-result").addEventListener("click", async () => {
  const total = latestResult.reduce(
    (sum, person) => sum + person.amount,
    0
  );

  const text = [
    "【傾斜割り勘】",
    ...latestResult.map(
      (person) =>
        `${person.name}：${yen.format(person.amount)}円` +
        `（${weightLabels[String(person.weight)]}）`
    ),
    `合計：${yen.format(total)}円`,
  ].join("\n");

  const status = document.querySelector("#copy-status");

  try {
    await navigator.clipboard.writeText(text);
    status.textContent = "コピーしました！";
  } catch {
    // file:// でClipboard APIが使えないブラウザ向け
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
});

// 初期参加者
addMember("幹事");
addMember();
addMember();