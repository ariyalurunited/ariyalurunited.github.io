(function () {
  "use strict";

  var demoEmail = "admin@aufc.local";
  var demoPassword = "aufc-demo";
  var storageKey = "aufc_formation_demo_v1";
  var modal = document.getElementById("admin-modal");
  var previewModal = document.getElementById("formation-preview-modal");
  var loginForm = document.getElementById("admin-login-form");
  var setupNote = document.getElementById("admin-setup-note");
  var dashboard = document.getElementById("admin-dashboard");
  var adminStatus = document.getElementById("admin-status");
  var formationAdminStatus = document.getElementById("formation-admin-status");
  var formationSection = document.getElementById("formation");
  var formationNavLink = document.getElementById("formation-nav-link");
  var publicFormation = document.getElementById("public-formation");
  var previewBoard = document.getElementById("formation-preview-board");
  var previewNote = document.getElementById("formation-preview-note");
  var previewDownload = document.getElementById("formation-preview-download");
  var formationStatus = document.getElementById("formation-status");
  var publicDownload = document.getElementById("download-formation");
  var adminDownload = document.getElementById("admin-download-formation");
  var playerRows = document.getElementById("admin-player-rows");
  var shapeSelect = document.getElementById("formation-choice");
  var slotsContainer = document.getElementById("formation-slots");
  var isAdmin = false;
  var storageAvailable = true;
  var storageWarning = "";
  var nextPlayerId = 1;
  var players = readEmbeddedPlayers();
  var publishedLineup = null;
  var previewShape = null;
  var isExampleLineup = false;
  var adminPlayers = players.slice();

  var layouts = {
    "4-3-3": [
      { label: "GK", x: 50, y: 89 },
      { label: "LB", x: 15, y: 73 }, { label: "CB", x: 38, y: 76 }, { label: "CB", x: 62, y: 76 }, { label: "RB", x: 85, y: 73 },
      { label: "LM", x: 23, y: 53 }, { label: "CM", x: 50, y: 57 }, { label: "RM", x: 77, y: 53 },
      { label: "LW", x: 18, y: 31 }, { label: "CF", x: 50, y: 27 }, { label: "RW", x: 82, y: 31 }
    ],
    "4-4-2": [
      { label: "GK", x: 50, y: 89 },
      { label: "LB", x: 15, y: 73 }, { label: "CB", x: 38, y: 76 }, { label: "CB", x: 62, y: 76 }, { label: "RB", x: 85, y: 73 },
      { label: "LM", x: 15, y: 54 }, { label: "CM", x: 38, y: 57 }, { label: "CM", x: 62, y: 57 }, { label: "RM", x: 85, y: 54 },
      { label: "ST", x: 36, y: 31 }, { label: "ST", x: 64, y: 31 }
    ],
    "3-5-2": [
      { label: "GK", x: 50, y: 89 },
      { label: "CB", x: 24, y: 75 }, { label: "CB", x: 50, y: 78 }, { label: "CB", x: 76, y: 75 },
      { label: "LM", x: 12, y: 53 }, { label: "CM", x: 31, y: 56 }, { label: "CM", x: 50, y: 59 }, { label: "CM", x: 69, y: 56 }, { label: "RM", x: 88, y: 53 },
      { label: "ST", x: 36, y: 31 }, { label: "ST", x: 64, y: 31 }
    ]
  };

  function readEmbeddedPlayers() {
    return Array.prototype.map.call(document.querySelectorAll(".squad-grid .player-card"), function (card) {
      var number = Number(card.querySelector(".player-number").textContent);
      return {
        id: "player-" + number,
        full_name: card.dataset.fullName || "",
        jersey_name: card.dataset.jerseyName || "",
        jersey_number: number,
        positions: card.querySelector(".player-position").textContent || "",
        image: card.dataset.playerImage || "",
        description: card.dataset.playerDescription || ""
      };
    });
  }

  function validPlayer(player) {
    return player && typeof player.id === "string" &&
      typeof player.full_name === "string" &&
      typeof player.jersey_name === "string" &&
      Number.isInteger(Number(player.jersey_number)) &&
      typeof player.positions === "string" &&
      (player.image === undefined || typeof player.image === "string") &&
      (player.description === undefined || typeof player.description === "string");
  }

  function restoreDemoState() {
    try {
      var stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      var state = JSON.parse(stored);
      if (!state || !Array.isArray(state.players) || !state.players.every(validPlayer)) {
        throw new Error("Saved demo data has an invalid format.");
      }
      players = sortPlayers(state.players);
      publishedLineup = state.lineup || null;
      isExampleLineup = state.isExampleLineup === true;
      adminPlayers = players.slice();
    } catch (error) {
      storageAvailable = false;
      storageWarning = "Could not read the previous browser demo data: " + error.message;
    }
  }

  function sortPlayers(list) {
    return list.slice().sort(function (a, b) {
      return Number(a.jersey_number) - Number(b.jersey_number);
    });
  }

  function rolesForPositions(positions) {
    var roles = [];
    String(positions).split(",").forEach(function (position) {
      var code = position.trim().toUpperCase();
      if (code === "GK") roles.push("goalkeeper");
      else if (/^(CB|LB|RB|LWB|RWB|SW)$/.test(code)) roles.push("defender");
      else if (/(MF|CM|AM|DM|LM|RM)$/.test(code)) roles.push("midfielder");
      else if (/(WF|CF|SS|ST|LW|RW|FW)$/.test(code)) roles.push("forward");
    });
    return Array.from(new Set(roles)).join(" ");
  }

  function renderRoster(list) {
    var grid = document.querySelector(".squad-grid");
    if (!grid) return;
    var existingProfiles = new Map();
    grid.querySelectorAll(".player-card").forEach(function (card) {
      var number = card.querySelector(".player-number").textContent.trim();
      existingProfiles.set(number, {
        image: card.dataset.playerImage || "",
        description: card.dataset.playerDescription || ""
      });
    });
    players = sortPlayers(list).map(function (player) {
      var existingProfile = existingProfiles.get(String(player.jersey_number)) || {};
      return Object.assign({}, player, {
        image: player.image || existingProfile.image,
        description: player.description || existingProfile.description
      });
    });
    grid.replaceChildren();
    players.forEach(function (player) {
      var card = document.createElement("article");
      card.className = "player-card reveal is-visible";
      card.dataset.role = rolesForPositions(player.positions);
      card.dataset.fullName = player.full_name;
      card.dataset.jerseyName = player.jersey_name;
      if (player.image) card.dataset.playerImage = player.image;
      if (player.description) card.dataset.playerDescription = player.description;

      var number = document.createElement("div");
      number.className = "player-number";
      number.textContent = player.jersey_number;
      var name = document.createElement("h3");
      name.className = "player-name";
      name.textContent = player.jersey_name.toUpperCase();
      var position = document.createElement("span");
      position.className = "player-position";
      position.textContent = player.positions;
      card.append(number, name, position);
      window.setupPlayerCard(card);
      grid.appendChild(card);
    });
  }

  function setStatus(element, message) {
    if (element) element.textContent = message;
  }

  function persistState(nextPlayers, nextLineup, exampleLineup) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        version: 1,
        players: nextPlayers,
        lineup: nextLineup,
        isExampleLineup: exampleLineup === true
      }));
      storageAvailable = true;
      storageWarning = "";
      return true;
    } catch (error) {
      storageAvailable = false;
      return false;
    }
  }

  function saveMessage(subject) {
    return storageAvailable ?
      subject + " saved in this browser only; it is not shared with other visitors or devices." :
      subject + " updated for this page only because browser storage is unavailable.";
  }

  function makeSvgElement(name, attributes) {
    var element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attributes || {}).forEach(function (key) {
      element.setAttribute(key, attributes[key]);
    });
    return element;
  }

  function drawLineup(target, shape, ids) {
    if (!layouts[shape] || !Array.isArray(ids)) {
      showEmptyFormation(target, "The saved lineup has invalid formation data. Review it in the demo admin panel.");
      return false;
    }
    var playerById = new Map(players.map(function (player) { return [String(player.id), player]; }));
    var selected = ids.map(function (id) { return playerById.get(String(id)); });
    if (selected.length !== 11 || selected.some(function (player) { return !player; })) {
      showEmptyFormation(target, "The saved lineup is incomplete. Choose and save all 11 players in the demo admin panel.");
      return false;
    }

    var svg = makeSvgElement("svg", {
      viewBox: "0 0 700 1000",
      width: "700",
      height: "1000",
      role: "img",
      "aria-label": "Ariyalur United FC " + shape + " starting lineup"
    });
    var svgStyle = makeSvgElement("style");
    svgStyle.textContent = ".pitch-lines{fill:none;stroke:#fff;stroke-opacity:.72;stroke-width:3}.pitch-mark{fill:none;stroke:#fff;stroke-opacity:.72;stroke-width:3}.formation-player circle{fill:#1f5cff;stroke:#fff;stroke-width:4}.formation-player .jersey{fill:#fff;font-family:Arial,sans-serif;font-size:23px;font-weight:900;text-anchor:middle;dominant-baseline:central}.formation-player .position{fill:#ffda72;font-family:Arial,sans-serif;font-size:15px;font-weight:900;text-anchor:middle;stroke:#0b422f;stroke-width:3;paint-order:stroke;stroke-linejoin:round}.formation-player .name{fill:#fff;font-family:Arial,sans-serif;font-size:13px;font-weight:800;text-anchor:middle;stroke:#0b422f;stroke-width:3;paint-order:stroke;stroke-linejoin:round}";
    svg.appendChild(svgStyle);
    svg.appendChild(makeSvgElement("rect", { x: 10, y: 10, width: 680, height: 980, rx: 5, fill: "#126542" }));
    svg.appendChild(makeSvgElement("rect", { x: 28, y: 28, width: 644, height: 944, class: "pitch-lines" }));
    svg.appendChild(makeSvgElement("line", { x1: 28, y1: 500, x2: 672, y2: 500, class: "pitch-lines" }));
    svg.appendChild(makeSvgElement("circle", { cx: 350, cy: 500, r: 90, class: "pitch-mark" }));
    svg.appendChild(makeSvgElement("circle", { cx: 350, cy: 500, r: 4, fill: "white" }));
    svg.appendChild(makeSvgElement("rect", { x: 185, y: 28, width: 330, height: 135, class: "pitch-lines" }));
    svg.appendChild(makeSvgElement("rect", { x: 185, y: 837, width: 330, height: 135, class: "pitch-lines" }));
    svg.appendChild(makeSvgElement("rect", { x: 270, y: 28, width: 160, height: 58, class: "pitch-lines" }));
    svg.appendChild(makeSvgElement("rect", { x: 270, y: 914, width: 160, height: 58, class: "pitch-lines" }));

    layouts[shape].forEach(function (spot, index) {
      var player = selected[index];
      var x = 28 + (spot.x / 100) * 644;
      var y = 28 + (spot.y / 100) * 944;
      var group = makeSvgElement("g", { class: "formation-player" });
      var position = makeSvgElement("text", { x: x, y: y - 38, class: "position" });
      position.textContent = spot.label;
      group.appendChild(position);
      group.appendChild(makeSvgElement("circle", { cx: x, cy: y, r: 28 }));
      var number = makeSvgElement("text", { x: x, y: y + 1, class: "jersey" });
      number.textContent = player.jersey_number;
      group.appendChild(number);
      var words = String(player.full_name).trim().split(/\s+/);
      var nameLines = [];
      while (words.length && nameLines.length < 2) {
        var line = words.shift();
        while (words.length && (line + " " + words[0]).length <= 14) line += " " + words.shift();
        nameLines.push(line);
      }
      if (words.length) nameLines[1] = nameLines[1].slice(0, 12).trimEnd() + "…";
      var name = makeSvgElement("text", { x: x, y: y + 48, class: "name" });
      nameLines.forEach(function (line, lineIndex) {
        var textLine = makeSvgElement("tspan", { x: x, dy: lineIndex === 0 ? 0 : 15 });
        textLine.textContent = line;
        name.appendChild(textLine);
      });
      group.appendChild(name);
      svg.appendChild(group);
    });

    target.replaceChildren(svg);
    target.dataset.shape = shape;
    target.dataset.playerIds = JSON.stringify(ids);
    return true;
  }

  function showEmptyFormation(target, text) {
    target.replaceChildren();
    var message = document.createElement("p");
    message.className = "formation-public-status";
    message.textContent = text;
    target.appendChild(message);
  }

  function setFormationVisibility(isVisible) {
    formationSection.hidden = !isVisible;
    formationNavLink.hidden = !isVisible;
    if (isVisible) formationSection.classList.add("is-visible");
  }

  function setDownloadAvailability(isAvailable) {
    publicDownload.disabled = !(publishedLineup && publicFormation.querySelector("svg"));
    adminDownload.disabled = !isAvailable;
  }

  function publishLineup(lineup) {
    publishedLineup = lineup;
    if (!lineup) {
      showEmptyFormation(publicFormation, "No main 11 formation has been saved in this browser demo yet.");
      setStatus(formationStatus, "Sign in to the demo admin panel to publish a starting 11.");
      setDownloadAvailability(false);
      return;
    }
    var ids = Array.isArray(lineup.slot_player_ids) ? lineup.slot_player_ids : [];
    var valid = drawLineup(publicFormation, lineup.shape, ids);
    setDownloadAvailability(valid);
    setStatus(formationStatus, valid && isExampleLineup ?
      "Illustrative demo preview only—not an official starting 11." :
      valid ?
      "Demo formation: " + lineup.shape + ". This lineup is saved only in this browser." :
      "The saved lineup needs admin review before it can be downloaded.");
  }

  function makeExampleLineup(list) {
    var firstEleven = sortPlayers(list).slice(0, 11);
    if (firstEleven.length !== 11) return null;
    return {
      shape: "4-3-3",
      slot_player_ids: firstEleven.map(function (player) { return player.id; })
    };
  }

  function makePlayerSelect(value) {
    var select = document.createElement("select");
    var empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Select a player";
    select.appendChild(empty);
    sortPlayers(adminPlayers).forEach(function (player) {
      var option = document.createElement("option");
      option.value = player.id;
      option.textContent = "#" + player.jersey_number + " · " + player.jersey_name;
      if (String(player.id) === String(value)) option.selected = true;
      select.appendChild(option);
    });
    return select;
  }

  function renderSlotControls(selectedIds) {
    selectedIds = selectedIds || [];
    slotsContainer.replaceChildren();
    layouts[shapeSelect.value].forEach(function (spot, index) {
      var label = document.createElement("label");
      label.className = "formation-slot";
      var role = document.createElement("span");
      role.textContent = (index + 1) + ". " + spot.label;
      var select = makePlayerSelect(selectedIds[index] || "");
      select.setAttribute("aria-label", "Player " + (index + 1) + " " + spot.label);
      select.addEventListener("change", function () {
        setDownloadAvailability(false);
        setStatus(formationAdminStatus, "Unsaved lineup changes. Save the main 11 before downloading.");
      });
      label.append(role, select);
      slotsContainer.appendChild(label);
    });
  }

  function currentSlotIds() {
    return Array.prototype.map.call(slotsContainer.querySelectorAll("select"), function (select) {
      return select.value;
    });
  }

  function renderAdminRows(list) {
    playerRows.replaceChildren();
    list.forEach(function (player) {
      var row = document.createElement("tr");
      row.dataset.playerId = player.id;
      row.dataset.playerImage = player.image || "";
      row.dataset.playerDescription = player.description || "";
      [
        ["full_name", player.full_name],
        ["jersey_name", player.jersey_name],
        ["jersey_number", player.jersey_number],
        ["positions", player.positions]
      ].forEach(function (field) {
        var cell = document.createElement("td");
        var input = document.createElement("input");
        input.name = field[0];
        input.value = field[1] === undefined || field[1] === null ? "" : field[1];
        input.setAttribute("aria-label", field[0].replace("_", " "));
        if (field[0] === "jersey_number") input.inputMode = "numeric";
        cell.appendChild(input);
        row.appendChild(cell);
      });
      var actionCell = document.createElement("td");
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "admin-remove";
      remove.textContent = "REMOVE";
      remove.addEventListener("click", function () { row.remove(); });
      actionCell.appendChild(remove);
      row.appendChild(actionCell);
      playerRows.appendChild(row);
    });
  }

  function showDashboard() {
    isAdmin = true;
    setFormationVisibility(true);
    loginForm.hidden = true;
    dashboard.hidden = false;
    setupNote.textContent = "DEMO MODE: This client-side login is not secure. Your edits are stored in this browser only.";
    adminPlayers = players.slice();
    renderAdminRows(adminPlayers);
    shapeSelect.value = publishedLineup && layouts[publishedLineup.shape] ? publishedLineup.shape : "4-3-3";
    renderSlotControls(publishedLineup && Array.isArray(publishedLineup.slot_player_ids) ? publishedLineup.slot_player_ids : []);
    setStatus(adminStatus, "Demo admin session. Changes are not shared with other visitors or devices.");
    setStatus(formationAdminStatus, isExampleLineup ?
      "Illustrative sample lineup loaded. Choose players and save to replace it." :
      publishedLineup ? "Current browser-demo lineup loaded." : "Choose 11 different players, then save the starting lineup.");
    if (storageWarning) setStatus(adminStatus, storageWarning);
  }

  function readAdminRows() {
    return Array.prototype.map.call(playerRows.querySelectorAll("tr"), function (row) {
      var values = {};
      row.querySelectorAll("input").forEach(function (input) {
        values[input.name] = input.value.trim();
      });
      return {
        id: row.dataset.playerId,
        full_name: values.full_name,
        jersey_name: values.jersey_name,
        jersey_number: values.jersey_number === "" ? NaN : Number(values.jersey_number),
        positions: values.positions,
        image: row.dataset.playerImage || "",
        description: row.dataset.playerDescription || ""
      };
    });
  }

  function validatePlayers(list) {
    if (!list.length) throw new Error("The squad cannot be empty.");
    var numbers = new Set();
    list.forEach(function (player) {
      if (!player.full_name || !player.jersey_name || !player.positions ||
          !Number.isInteger(player.jersey_number) || player.jersey_number < 0 || player.jersey_number > 99) {
        throw new Error("Complete every player field and use a jersey number from 0 to 99.");
      }
      if (numbers.has(player.jersey_number)) throw new Error("Jersey numbers must be unique.");
      numbers.add(player.jersey_number);
    });
  }

  function saveSquad() {
    setStatus(adminStatus, "Saving demo squad changes…");
    try {
      var nextPlayers = sortPlayers(readAdminRows());
      validatePlayers(nextPlayers);
      var nextIds = new Set(nextPlayers.map(function (player) { return player.id; }));
      var deletedIds = players.filter(function (player) { return !nextIds.has(player.id); }).map(function (player) {
        return player.id;
      });
      if (!isExampleLineup && publishedLineup && Array.isArray(publishedLineup.slot_player_ids) &&
          publishedLineup.slot_player_ids.some(function (id) { return deletedIds.indexOf(String(id)) !== -1; })) {
        throw new Error("A removed player is in the saved starting 11. Save a replacement lineup first.");
      }

      var selectedIds = currentSlotIds();
      var nextLineup = isExampleLineup ? makeExampleLineup(nextPlayers) : publishedLineup;
      var savedToBrowser = persistState(nextPlayers, nextLineup, isExampleLineup);
      players = nextPlayers;
      publishedLineup = nextLineup;
      adminPlayers = players.slice();
      renderAdminRows(adminPlayers);
      renderRoster(players);
      renderSlotControls(selectedIds);
      if (isExampleLineup) publishLineup(publishedLineup);
      setStatus(adminStatus, saveMessage("Squad updates"));
      setStatus(formationAdminStatus, savedToBrowser ?
        "Squad saved in this browser. Review the starting 11 if needed." :
        "Squad updated for this page only; browser storage is unavailable.");
    } catch (error) {
      setStatus(adminStatus, error.message);
    }
  }

  function saveLineup() {
    setStatus(formationAdminStatus, "Saving the demo starting 11…");
    try {
      var ids = currentSlotIds();
      if (ids.length !== 11 || ids.some(function (id) { return !id; })) {
        throw new Error("Select a squad player for each of the 11 positions.");
      }
      if (new Set(ids).size !== 11) throw new Error("Each starting position needs a different player.");
      var selectedPlayers = new Set(players.map(function (player) { return String(player.id); }));
      if (ids.some(function (id) { return !selectedPlayers.has(String(id)); })) {
        throw new Error("Save squad changes before assigning new players to the lineup.");
      }

      var lineup = { shape: shapeSelect.value, slot_player_ids: ids };
      var savedToBrowser = persistState(players, lineup, false);
      publishedLineup = lineup;
      isExampleLineup = false;
      var valid = drawLineup(publicFormation, lineup.shape, ids);
      setDownloadAvailability(valid);
      setStatus(formationStatus, "Demo formation saved. It is visible only in this browser.");
      setStatus(formationAdminStatus, savedToBrowser ?
        "Main 11 saved in this browser demo." :
        "Main 11 updated for this page only; browser storage is unavailable.");
    } catch (error) {
      setDownloadAvailability(Boolean(publishedLineup && publicFormation.querySelector("svg")));
      setStatus(formationAdminStatus, error.message);
    }
  }

  function openFormationPreview(shape, ids, isDraft) {
    var statusElement = isDraft ? formationAdminStatus : formationStatus;
    if (!layouts[shape]) {
      setStatus(statusElement, "Select a valid formation before previewing.");
      return;
    }
    if (ids.length !== 11 || ids.some(function (id) { return !id; })) {
      setStatus(statusElement, "Select a player for each of the 11 positions before previewing.");
      return;
    }
    if (new Set(ids).size !== 11) {
      setStatus(statusElement, "Each starting position needs a different player.");
      return;
    }
    var availablePlayers = new Set(players.map(function (player) { return String(player.id); }));
    if (ids.some(function (id) { return !availablePlayers.has(String(id)); })) {
      setStatus(statusElement, "Save squad changes before previewing newly added players.");
      return;
    }
    if (!drawLineup(previewBoard, shape, ids)) {
      setStatus(statusElement, "The preview could not be created from the selected lineup.");
      return;
    }

    previewShape = shape;
    setStatus(previewNote, isDraft ?
      "Preview of your current selection. Save the main 11 to keep this lineup in the browser demo." :
      "Review the player positions, names, and jersey numbers before downloading.");
    previewModal.hidden = false;
    document.body.style.overflow = "hidden";
    previewDownload.focus();
  }

  function downloadPng(svg, shape) {
    if (!svg || !shape) return Promise.reject(new Error("Preview a complete formation before downloading."));
    var svgMarkup = new XMLSerializer().serializeToString(svg);
    var svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    var objectUrl = URL.createObjectURL(svgBlob);
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = 1400;
          canvas.height = 2000;
          var context = canvas.getContext("2d");
          if (!context) throw new Error("Image canvas is not available in this browser.");
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function (blob) {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error("The formation image could not be created."));
              return;
            }
            var link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "aufc-" + shape + "-formation.png";
            link.click();
            window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
            resolve();
          }, "image/png");
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };
      image.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("The formation image could not be rendered."));
      };
      image.src = objectUrl;
    });
  }

  document.getElementById("admin-open").addEventListener("click", function () {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (isAdmin) showDashboard();
    else {
      loginForm.hidden = false;
      dashboard.hidden = true;
      document.getElementById("admin-email").focus();
    }
  });

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }
  function closePreview() {
    previewModal.hidden = true;
    document.body.style.overflow = modal.hidden ? "" : "hidden";
  }
  document.getElementById("admin-close").addEventListener("click", closeModal);
  document.getElementById("formation-preview-close").addEventListener("click", closePreview);
  document.getElementById("formation-preview-done").addEventListener("click", closePreview);
  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeModal();
  });
  previewModal.addEventListener("click", function (event) {
    if (event.target === previewModal) closePreview();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!previewModal.hidden) closePreview();
    else if (!modal.hidden) closeModal();
  });

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var email = document.getElementById("admin-email").value.trim().toLowerCase();
    var password = document.getElementById("admin-password").value;
    if (email !== demoEmail || password !== demoPassword) {
      setStatus(setupNote, "Demo sign-in failed. Use admin@aufc.local and the demo password shown above.");
      return;
    }
    document.getElementById("admin-password").value = "";
    showDashboard();
  });

  document.getElementById("add-player").addEventListener("click", function () {
    var next = adminPlayers.slice();
    next.push({
      id: "demo-player-" + Date.now() + "-" + nextPlayerId++,
      full_name: "",
      jersey_name: "",
      jersey_number: "",
      positions: ""
    });
    renderAdminRows(next);
    var first = playerRows.querySelector("tr:last-child input");
    if (first) first.focus();
    setStatus(adminStatus, "Enter all player details, then save squad updates in this browser.");
  });

  document.getElementById("save-squad").addEventListener("click", saveSquad);
  document.getElementById("save-formation").addEventListener("click", saveLineup);
  document.getElementById("admin-logout").addEventListener("click", function () {
    isAdmin = false;
    setFormationVisibility(false);
    loginForm.reset();
    loginForm.hidden = false;
    dashboard.hidden = true;
    setStatus(setupNote, "Demo signed out. Demo credentials: admin@aufc.local · aufc-demo. This is not secure authentication.");
  });
  shapeSelect.addEventListener("change", function () {
    var selected = currentSlotIds();
    renderSlotControls(selected);
    setDownloadAvailability(false);
    setStatus(formationAdminStatus, "Formation shape changed. Save the main 11 to update the demo lineup.");
  });

  publicDownload.addEventListener("click", function () {
    if (publishedLineup) openFormationPreview(publishedLineup.shape, publishedLineup.slot_player_ids, false);
  });
  adminDownload.addEventListener("click", function () {
    if (publishedLineup) openFormationPreview(publishedLineup.shape, publishedLineup.slot_player_ids, false);
  });
  document.getElementById("preview-current-formation").addEventListener("click", function () {
    openFormationPreview(shapeSelect.value, currentSlotIds(), true);
  });
  previewDownload.addEventListener("click", function () {
    previewDownload.disabled = true;
    downloadPng(previewBoard.querySelector("svg"), previewShape).then(function () {
      setStatus(previewNote, "Formation PNG downloaded. Close this preview to continue editing.");
    }).catch(function (error) {
      setStatus(previewNote, error.message);
    }).finally(function () {
      previewDownload.disabled = false;
    });
  });

  restoreDemoState();
  if (!publishedLineup) {
    publishedLineup = makeExampleLineup(players);
    isExampleLineup = Boolean(publishedLineup);
  }
  if (localStorageHasState()) renderRoster(players);
  publishLineup(publishedLineup);
  if (storageWarning) setStatus(formationStatus, storageWarning);

  function localStorageHasState() {
    try {
      return Boolean(window.localStorage.getItem(storageKey));
    } catch (error) {
      storageAvailable = false;
      storageWarning = "Browser storage is unavailable. Demo edits will not persist after this page closes.";
      return false;
    }
  }
}());
