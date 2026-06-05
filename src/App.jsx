import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;
const DEFAULT_PAYMENT_AMOUNT = 17000;

const monthNames = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const initialForm = {
  firstName: "",
  lastName: "",
  dni: "",
  birthDate: "",
  discipline: "FUTBOL",
  role: "JUGADOR",
  status: "ACTIVO"
};

const splitFullName = (fullName = "") => {
  const parts = fullName.trim().split(" ").filter(Boolean);

  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
  };
};

const getPlayerName = (player) => {
  const firstName = player.firstName || splitFullName(player.name).firstName;
  const lastName = player.lastName || splitFullName(player.name).lastName;

  return `${firstName} ${lastName}`.trim() || player.name || "Sin nombre";
};

const getOperationalStatus = (player) => {
  if (player.status === "INACTIVO") return "INACTIVO";
  return "ACTIVO";
};

const getFeeStatus = (player) => {
  if (player.role && player.role !== "JUGADOR") return "NO_APLICA";

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const hasCurrentMonthPaid = player.payments?.some(
    (payment) =>
      Number(payment.month) === currentMonth &&
      Number(payment.year) === currentYear
  );

  if (hasCurrentMonthPaid) return "AL_DIA";

  if (player.feeStatus) return player.feeStatus;

  return "PENDIENTE";
};

const formatRole = (role) => {
  const labels = {
    JUGADOR: "Jugador",
    PROFE: "Profe",
    ADMIN: "Admin",
    DIRECTIVO: "Directivo",
    COLABORADOR: "Colaborador",
  };

  return labels[role] || role || "Jugador";
};

const formatDiscipline = (discipline) => {
  const labels = {
    FUTBOL: "Fútbol",
    BASQUET: "Básquet",
  };

  return labels[discipline] || discipline || "Fútbol";
};

const normalizeCategory = (category) => category || "SIN_CATEGORIA";

const formatCategory = (category) => {
  const labels = {
    ESCUELITA: "Escuelita",
    "2020/2019": "2020/2019",
    "2018/2017": "2018/2017",
    "2016/2015": "2016/2015",
    "2014/2013": "2014/2013",
    SIN_CATEGORIA: "Sin categoría",
  };

  return labels[normalizeCategory(category)] || category || "Sin categoría";
};

const isPlayerRole = (role) => (role || "JUGADOR") === "JUGADOR";

const getDisplayCategory = (player) => {
  if (!isPlayerRole(player.role)) return "No aplica";
  return formatCategory(player.category);
};

const getAutoCategory = (birthDate, role) => {
  if (!isPlayerRole(role)) return "SIN_CATEGORIA";
  if (!birthDate) return "SIN_CATEGORIA";

  const year = Number(String(birthDate).slice(0, 4));

  if (!year) return "SIN_CATEGORIA";
  if (year >= 2021) return "ESCUELITA";
  if (year === 2020 || year === 2019) return "2020/2019";
  if (year === 2018 || year === 2017) return "2018/2017";
  if (year === 2016 || year === 2015) return "2016/2015";
  if (year === 2014 || year === 2013) return "2014/2013";

  return "SIN_CATEGORIA";
};

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const [clubs, setClubs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState("");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [message, setMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [paymentModal, setPaymentModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [disciplineFilter, setDisciplineFilter] = useState("TODOS");
  const [roleFilter, setRoleFilter] = useState("TODOS");
  const [feeFilter, setFeeFilter] = useState("TODOS");
  const [operativeFilter, setOperativeFilter] = useState("TODOS");
  const [categoryFilter, setCategoryFilter] = useState("TODOS");
  const [expandedRow, setExpandedRow] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const [paymentForm, setPaymentForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: DEFAULT_PAYMENT_AMOUNT,
  });

  const [form, setForm] = useState(initialForm);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const getVictoriaClubId = () => {
    const victoriaClub = clubs.find((club) =>
      String(club.name || club.nombre || "")
        .toLowerCase()
        .includes("victoria")
    );

    return victoriaClub?.id || clubs[0]?.id || null;
  };

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });

    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };

  const login = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginForm),
    });

    if (!res.ok) {
      showMessage("Email o contraseña incorrectos", "error");
      return;
    }

    const data = await res.json();

    localStorage.setItem("token", data.token);
    setToken(data.token);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setPlayers([]);
    setClubs([]);
    setEditingPlayer(null);
    setPaymentModal(null);
    setHistoryModal(null);
    setDeleteModal(null);
  };

  const loadClubs = async () => {
    const res = await fetch(`${API_URL}/api/clubs`, {
      headers: authHeaders,
    });

    if (!res.ok) {
      logout();
      return;
    }

    const data = await res.json();
    setClubs(data);

    if (data.length > 0) {
      setForm((prev) => ({
        ...prev,
        clubId: prev.clubId || data[0].id,
      }));
    }
  };

  const loadPlayers = async () => {
    const res = await fetch(`${API_URL}/api/players`, {
      headers: authHeaders,
    });

    if (!res.ok) {
      logout();
      return;
    }

    const data = await res.json();
    setPlayers(data);
  };

  useEffect(() => {
    if (token) {
      loadClubs();
      loadPlayers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleLoginChange = (e) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value,
    });
  };

 const handleChange = (e) => {
  const { name, value } = e.target;

  if (name === "birthDate") {
    const selectedDate = new Date(value);

    const today = new Date();
    today.setHours(0,0,0,0);

    if (selectedDate > today) {
      showMessage(
        "La fecha de nacimiento no puede ser futura",
        "error"
      );

      return;
    }
  }

  setForm({
    ...form,
    [name]: value,
  });
};

  const resetForm = () => {
    setForm(initialForm);
  };

  const editPlayer = (player) => {
    setEditingPlayer(player);

    const fallbackName = splitFullName(player.name);

    setForm({
      firstName: player.firstName || fallbackName.firstName,
      lastName: player.lastName || fallbackName.lastName,
      dni: player.dni || "",
      birthDate: player.birthDate ? player.birthDate.slice(0, 10) : "",
      discipline: player.discipline || "FUTBOL",
      role: player.role || "JUGADOR",
      status: getOperationalStatus(player),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingPlayer(null);
    resetForm();
    setPhotoFile(null);
  };

  const validatePlayerForm = () => {
    if (!form.firstName || !form.dni) {
      showMessage("Nombre y DNI son obligatorios", "error");
      return false;
    }

    if (!/^\d+$/.test(form.dni)) {
      showMessage("El DNI debe contener solo números", "error");
      return false;
    }

    if (form.dni.length < 7 || form.dni.length > 8) {
      showMessage("El DNI debe tener 7 u 8 números", "error");
      return false;
    }

    const fullName = `${form.firstName} ${form.lastName}`.trim();

    if (!/^[A-Za-zÀ-ÿ\s]+$/.test(fullName)) {
      showMessage("Nombre y apellido solo pueden contener letras", "error");
      return false;
    }

    if (form.role === "JUGADOR" && !form.birthDate) {
      showMessage("La fecha de nacimiento es obligatoria para jugadores", "error");
      return false;
    }

    return true;
  };

  const createPlayer = async (e) => {
    e.preventDefault();

    if (!validatePlayerForm()) return;

    if (!getVictoriaClubId()) {
      showMessage("No se encontró Club Victoria en la API", "error");
      return;
    }

    const url = editingPlayer
      ? `${API_URL}/api/players/${editingPlayer.id}`
      : `${API_URL}/api/players`;

    const method = editingPlayer ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: authHeaders,
      body: JSON.stringify({
        ...form,
        clubId: getVictoriaClubId(),
        category: getAutoCategory(form.birthDate, form.role),
        feeStatus: form.role === "JUGADOR" ? "PENDIENTE" : "NO_APLICA",
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      showMessage(errorData.message || "Error al guardar persona", "error");
      return;
    }

    showMessage(
      editingPlayer
        ? "Persona actualizada correctamente"
        : "Persona creada correctamente",
      "success"
    );

    setEditingPlayer(null);
    resetForm();
    loadPlayers();
  };

  const updateOperationalStatus = async (playerId, status) => {
    const player = players.find((item) => item.id === playerId);

    const res = await fetch(`${API_URL}/api/players/${playerId}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: player.firstName || splitFullName(player.name).firstName,
        lastName: player.lastName || splitFullName(player.name).lastName,
        dni: player.dni,
        birthDate: player.birthDate ? player.birthDate.slice(0, 10) : "",
        discipline: player.discipline || "FUTBOL",
        role: player.role || "JUGADOR",
        status,
        clubId: player.clubId || player.club?.id || getVictoriaClubId(),
        category: getAutoCategory(
          player.birthDate ? player.birthDate.slice(0, 10) : "",
          player.role || "JUGADOR"
        ),
        feeStatus: player.feeStatus || getFeeStatus(player),
      }),
    });

    if (!res.ok) {
      showMessage("Error al actualizar estado operativo", "error");
      return;
    }

    showMessage("Estado operativo actualizado correctamente", "success");
    loadPlayers();
  };

  const openDeleteModal = (player) => {
    setDeleteModal(player);
  };

  const confirmDeletePlayer = async () => {
    if (!deleteModal) return;

    const playerId = deleteModal.id || deleteModal._id;

    if (!playerId) {
      showMessage("No se encontró el ID de la persona", "error");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/players/${playerId}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        showMessage("Error al eliminar persona", "error");
        return;
      }

      setPlayers((prev) =>
        prev.filter((player) => (player.id || player._id) !== playerId)
      );

      setDeleteModal(null);
      showMessage(`${getPlayerName(deleteModal)} eliminado correctamente`, "success");
      loadPlayers();
    } catch (error) {
      showMessage("Error inesperado al eliminar", "error");
    }
  };

  const openPaymentModal = (player) => {
    if (player.role && player.role !== "JUGADOR") {
      showMessage("Esta persona no paga cuota", "error");
      return;
    }

    setPaymentModal(player);

    setPaymentForm({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount: DEFAULT_PAYMENT_AMOUNT,
    });
  };

  const registerPayment = async (e) => {
    e.preventDefault();

    if (!paymentModal) return;

    if (!paymentForm.month || !paymentForm.year || !paymentForm.amount) {
      showMessage("Completá todos los datos del pago", "error");
      return;
    }

    const res = await fetch(`${API_URL}/api/payments`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        playerId: paymentModal.id,
        month: Number(paymentForm.month),
        year: Number(paymentForm.year),
        amount: Number(paymentForm.amount),
      }),
    });

    if (!res.ok) {
      showMessage("Error al registrar pago", "error");
      return;
    }

    showMessage(`Pago registrado para ${getPlayerName(paymentModal)}`, "success");
    setPaymentModal(null);
    loadPlayers();
  };

  const quickPayCurrentMonth = async (player) => {
    if (player.role && player.role !== "JUGADOR") {
      showMessage("Esta persona no paga cuota", "error");
      return;
    }



    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const res = await fetch(`${API_URL}/api/payments`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        playerId: player.id,
        month,
        year,
        amount: DEFAULT_PAYMENT_AMOUNT,
      }),
    });

    if (!res.ok) {
      showMessage("Error al marcar el mes actual como pagado", "error");
      return;
    }

    showMessage(
      `Mes actual pagado para ${getPlayerName(player)} por $${formatAmount(DEFAULT_PAYMENT_AMOUNT)}`,
      "success"
    );

    loadPlayers();
  };

const formatDNI = (dni) => {
  if (!dni) return '';
  return String(dni).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '';
  return Number(amount).toLocaleString('es-AR');
};

  const copyCarnetLink = async (player) => {
    const link = `${API_URL}/public-api/validate/${player.qrToken}/view`;

    try {
      await navigator.clipboard.writeText(link);
      showMessage("Link del carnet copiado", "success");
    } catch (error) {
      showMessage("No se pudo copiar el link", "error");
    }
  };

  const deletePaymentById = async (paymentId) => {
    const res = await fetch(`${API_URL}/api/payments/${paymentId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    if (!res.ok) {
      showMessage("Error al eliminar pago", "error");
      return;
    }
    showMessage("Pago eliminado correctamente", "success");
    if (historyModal) {
      setHistoryModal(prev => ({
        ...prev,
        payments: prev.payments.filter(p => p.id !== paymentId),
      }));
    }
    loadPlayers();
  };

  const getDeudaAlert = () => {
  const today = new Date();
  const day = today.getDate();
  const deudores = players.filter(
    (p) => (!p.role || p.role === "JUGADOR") && getFeeStatus(p) === "DEUDA"
  );
  if (deudores.length === 0) return null;
  return {
    day,
    count: deudores.length,
    names: deudores.slice(0, 3).map((p) => getPlayerName(p)),
  };
};

const uploadPhoto = async (playerId, file) => {
  const formData = new FormData();
  formData.append("photo", file);
  const res = await fetch(`${API_URL}/api/players/${playerId}/photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    showMessage("Error al subir foto", "error");
    return;
  }
  const data = await res.json();
  showMessage("Foto actualizada correctamente", "success");
  setPhotoFile(null);
  setEditingPlayer(prev => ({ ...prev, photoUrl: data.photoUrl })); // ← fix
  loadPlayers();
};

  const stats = {
    total: players.length,
    futbol: players.filter((player) => player.discipline === "FUTBOL").length,
    basquet: players.filter((player) => player.discipline === "BASQUET").length,
    jugadores: players.filter((player) => (player.role || "JUGADOR") === "JUGADOR").length,
    profes: players.filter((player) => player.role === "PROFE").length,
    alDia: players.filter((player) => getFeeStatus(player) === "AL_DIA").length,
    pendiente: players.filter((player) => getFeeStatus(player) === "PENDIENTE").length,
    deuda: players.filter((player) => getFeeStatus(player) === "DEUDA").length,
    inactivo: players.filter((player) => getOperationalStatus(player) === "INACTIVO").length,
  };

  const getLastPayment = (player) => {
    if (!player.payments || player.payments.length === 0) return null;
    return player.payments[0];
  };

  const filteredPlayers = players.filter((player) => {
    const playerDiscipline = player.discipline || "FUTBOL";
    const playerRole = player.role || "JUGADOR";
    const playerFeeStatus = getFeeStatus(player);
    const playerOperationalStatus = getOperationalStatus(player);
    const playerCategory = normalizeCategory(player.category);

    const text = `
      ${player.firstName || ""}
      ${player.lastName || ""}
      ${player.name || ""}
      ${player.dni || ""}
      ${getDisplayCategory(player)}
      ${formatCategory(playerCategory)}
      ${playerCategory}
      ${formatDiscipline(playerDiscipline)}
      ${formatRole(playerRole)}
    `.toLowerCase();

    const matchesSearch = text.includes(search.toLowerCase());

    const matchesDiscipline =
      disciplineFilter === "TODOS" || playerDiscipline === disciplineFilter;

    const matchesRole =
      roleFilter === "TODOS" || playerRole === roleFilter;

    const matchesFee =
      feeFilter === "TODOS" || playerFeeStatus === feeFilter;

    const matchesOperative =
      operativeFilter === "TODOS" || playerOperationalStatus === operativeFilter;

    const matchesCategory =
      categoryFilter === "TODOS" ||
      (isPlayerRole(playerRole) && playerCategory === categoryFilter);

    return (
      matchesSearch &&
      matchesDiscipline &&
      matchesRole &&
      matchesFee &&
      matchesOperative &&
      matchesCategory
    );
  });

  if (!token) {
    return (
      <main className="page loginPage">
        {message && <div className={`toast ${message.type}`}>{message.text}</div>}

        <section className="loginCard">
          <h1>Panel Club Victoria</h1>
          <p>Ingresá para administrar carnets QR</p>

          <form onSubmit={login} className="loginForm">
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={handleLoginChange}
              required
            />

            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              value={loginForm.password}
              onChange={handleLoginChange}
              required
            />

            <button type="submit">Ingresar</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="header">
        <div className="brand">
          <img src="/escudo-victoria.png" alt="Escudo Club Victoria" />

          <div>
            <h1>Panel Club Victoria</h1>
            <p>Administración de jugadores, profes y carnets QR</p>
          </div>
        </div>

        <button className="danger logoutBtn" onClick={logout}>
          🚪 Cerrar sesión
        </button>
      </section>

      {message && <div className={`toast ${message.type}`}>{message.text}</div>}

      {(() => {
  const alert = getDeudaAlert();
  if (!alert) return null;
  return (
    <div className="deudaAlert">
      <span className="deudaAlertIcon">⚠️</span>
      <div>
        <strong>{alert.count} jugador{alert.count > 1 ? "es" : ""} en DEUDA</strong>
        <span>
          {alert.names.join(", ")}
          {alert.count > 3 ? ` y ${alert.count - 3} más` : ""}
          {" — "}Día {alert.day} del mes
        </span>
      </div>
    </div>
  );
})()}

      <section className="statsGrid">
        <button
          className={`statCard ${statusFilter === "TODOS" ? "active" : ""}`}
          onClick={() => setStatusFilter("TODOS")}
        >
          <span>Total</span>
          <strong>{stats.total}</strong>
        </button>

        <button
          className={`statCard green ${statusFilter === "FUTBOL" ? "active" : ""}`}
          onClick={() => setStatusFilter("FUTBOL")}
        >
          <span>Fútbol</span>
          <strong>{stats.futbol}</strong>
        </button>

        <button
          className={`statCard blue ${statusFilter === "BASQUET" ? "active" : ""}`}
          onClick={() => setStatusFilter("BASQUET")}
        >
          <span>Básquet</span>
          <strong>{stats.basquet}</strong>
        </button>

        <button
          className={`statCard orange ${statusFilter === "PENDIENTE" ? "active" : ""}`}
          onClick={() => setStatusFilter("PENDIENTE")}
        >
          <span>Pendientes</span>
          <strong>{stats.pendiente}</strong>
        </button>

        <button
          className={`statCard red ${statusFilter === "DEUDA" ? "active" : ""}`}
          onClick={() => setStatusFilter("DEUDA")}
        >
          <span>Con deuda</span>
          <strong>{stats.deuda}</strong>
        </button>

        <button
          className={`statCard gray ${statusFilter === "PROFE" ? "active" : ""}`}
          onClick={() => setStatusFilter("PROFE")}
        >
          <span>Profes</span>
          <strong>{stats.profes}</strong>
        </button>
      </section>

      <section className="card">
        <h2 className="sectionTitle">
          <span>👤➕</span>
          {editingPlayer ? "Editar persona" : "Cargar persona"}
        </h2>

        <form onSubmit={createPlayer} className="form playerFormV2">
          <input
            name="firstName"
            placeholder="Nombre"
            value={form.firstName}
            onChange={(e) => {
              const value = e.target.value.replace(/[^A-Za-zÀ-ÿ\s]/g, "");
              setForm({ ...form, firstName: value });
            }}
            required
          />

          <input
            name="lastName"
            placeholder="Apellido"
            value={form.lastName}
            onChange={(e) => {
              const value = e.target.value.replace(/[^A-Za-zÀ-ÿ\s]/g, "");
              setForm({ ...form, lastName: value });
            }}
          />

          <input
            name="dni"
            placeholder="DNI"
            value={form.dni}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setForm({ ...form, dni: value });
            }}
            required
          />

 <div className={`birthDateWrap ${form.birthDate ? "hasValue" : ""}`}>
  <input
  type="date"
  name="birthDate"
  value={form.birthDate}
  max={new Date().toISOString().split("T")[0]}
  onChange={handleChange}
  className="birthInputNative"
  onClick={(e)=>e.target.showPicker?.()}
  onFocus={(e)=>e.target.showPicker?.()}
/>

  <span className="birthPlaceholder">
    📅 Fecha de nacimiento
  </span>
</div>

          <select name="discipline" value={form.discipline} onChange={handleChange}>
            <option value="FUTBOL">Fútbol</option>
            <option value="BASQUET">Básquet</option>
          </select>

          <select name="role" value={form.role} onChange={handleChange}>
            <option value="JUGADOR">Jugador</option>
            <option value="PROFE">Profe</option>
            <option value="ADMIN">Admin</option>
            <option value="DIRECTIVO">Directivo</option>
            <option value="COLABORADOR">Colaborador</option>
          </select>

          <select name="status" value={form.status} onChange={handleChange}>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>

          <button type="submit">
            {editingPlayer ? "Guardar cambios" : "Crear persona"}
          </button>

          {editingPlayer && (
  <div className="photoUploadWrap">
    {editingPlayer.photoUrl && (
      <img
        src={`${API_URL}${editingPlayer.photoUrl}`}
        alt="Foto actual"
        className="currentPhotoThumb"
      />
    )}
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={(e) => setPhotoFile(e.target.files[0])}
    />
    {photoFile && (
      <button
        type="button"
        className="uploadPhotoBtn"
        onClick={() => uploadPhoto(editingPlayer.id, photoFile)}
      >
        📷 Subir foto
      </button>
    )}
  </div>
)}
          
          {editingPlayer && (
            <button type="button" className="cancelBtn" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </form>
      </section>

      <section className="card">
        <h2 className="sectionTitle">🔎 Personas cargadas</h2>

        <input
          className="search"
          placeholder="Buscar nombre, DNI, categoría, disciplina o rol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filtersPanel">
  <select
    value={disciplineFilter}
    onChange={(e) => setDisciplineFilter(e.target.value)}
  >
    <option value="TODOS">Todas las disciplinas</option>
    <option value="FUTBOL">Fútbol</option>
    <option value="BASQUET">Básquet</option>
  </select>

  <select
    value={roleFilter}
    onChange={(e) => setRoleFilter(e.target.value)}
  >
    <option value="TODOS">Todos los roles</option>
    <option value="JUGADOR">Jugadores</option>
    <option value="PROFE">Profes</option>
    <option value="ADMIN">Admins</option>
    <option value="DIRECTIVO">Directivos</option>
    <option value="COLABORADOR">Colaboradores</option>
  </select>

  <select
    value={feeFilter}
    onChange={(e) => setFeeFilter(e.target.value)}
  >
    <option value="TODOS">Todas las cuotas</option>
    <option value="AL_DIA">Al día</option>
    <option value="PENDIENTE">Pendiente</option>
    <option value="DEUDA">Deuda</option>
    <option value="NO_APLICA">No aplica</option>
  </select>

  <select
    value={operativeFilter}
    onChange={(e) => setOperativeFilter(e.target.value)}
  >
    <option value="TODOS">Todos los estados</option>
    <option value="ACTIVO">Activos</option>
    <option value="INACTIVO">Inactivos</option>
  </select>

  <select
    value={categoryFilter}
    onChange={(e) => setCategoryFilter(e.target.value)}
  >
    <option value="TODOS">Todas las categorías</option>
    <option value="ESCUELITA">Escuelita</option>
    <option value="2020/2019">2020/2019</option>
    <option value="2018/2017">2018/2017</option>
    <option value="2016/2015">2016/2015</option>
    <option value="2014/2013">2014/2013</option>
    <option value="SIN_CATEGORIA">Sin categoría</option>
  </select>
</div>

        <div className="tableWrapper">
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th>DNI</th>
                <th>Disciplina</th>
                <th>Rol</th>
                <th>Categoría</th>
                <th>Operativo</th>
                <th>Cuota</th>
                <th>Última cuota</th>
                <th>QR</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredPlayers.map((player) => {
                const lastPayment = getLastPayment(player);
                const feeStatus = getFeeStatus(player);
                const operationalStatus = getOperationalStatus(player);

                return (
                  <tr
                    key={player.id}
                    className={expandedRow === player.id ? "playerRow flipped" : "playerRow"}
                  >
                    {expandedRow !== player.id ? (
                      <>
                        <td data-label="Persona">
  <div className="playerNameCell">
    {player.photoUrl ? (
      <img
        src={`${API_URL}${player.photoUrl}`}
        alt=""
        className="playerAvatar"
      />
    ) : (
      <div className="playerAvatarPlaceholder">
        {getPlayerName(player).charAt(0).toUpperCase()}
      </div>
    )}
    {getPlayerName(player)}
  </div>
</td>
                        <td data-label="DNI">{formatDNI(player.dni)}</td>
                        <td data-label="Disciplina">{formatDiscipline(player.discipline)}</td>
                        <td data-label="Rol">{formatRole(player.role || "JUGADOR")}</td>
                        <td data-label="Categoría">{getDisplayCategory(player)}</td>

                        <td data-label="Operativo">
                          <select
                            className={`statusSelect ${operationalStatus}`}
                            value={operationalStatus}
                            onChange={(e) =>
                              updateOperationalStatus(player.id, e.target.value)
                            }
                          >
                            <option value="ACTIVO">ACTIVO</option>
                            <option value="INACTIVO">INACTIVO</option>
                          </select>
                        </td>

                        <td data-label="Cuota">
                          <span className={`feeBadge ${feeStatus}`}>{feeStatus}</span>
                        </td>

                        <td data-label="Última cuota">
                          {lastPayment && (player.role || "JUGADOR") === "JUGADOR" ? (
                            <div className="paymentResume">
                              <strong>
                                {monthNames[lastPayment.month]} {lastPayment.year}
                              </strong>
                              <span>${formatAmount(lastPayment.amount)}</span>
                            </div>
                          ) : (
                            <span className="noPayment">
                              {(player.role || "JUGADOR") === "JUGADOR"
                                ? "Sin pagos"
                                : "No aplica"}
                            </span>
                          )}
                        </td>

                        <td data-label="QR">
                          <a
                            href={`${API_URL}/public-api/validate/${player.qrToken}/view`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver carnet
                          </a>

                          <a
                            href={`${API_URL}/public/qrcodes/${player.id}.png`}
                            download
                            target="_blank"
                            rel="noreferrer"
                          >
                            Descargar QR
                          </a>
                        </td>

                        <td data-label="Acciones">
                          <div className="actionStack">
                            <button onClick={() => editPlayer(player)}>Editar</button>

                            <button
                              className="moreBtn"
                              onClick={() => setExpandedRow(player.id)}
                            >
                              Ver más
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <td colSpan="10" className="rowBack">
                        <div className="rowBackInner">
                          <div>
                            <strong>{getPlayerName(player)}</strong>
                            <span>Acciones disponibles</span>
                          </div>

                          <div className="rowBackActions">
                            <button
                              className="cancelBtn"
                              onClick={() => setExpandedRow(null)}
                            >
                              Volver
                            </button>

                            {(player.role || "JUGADOR") === "JUGADOR" && (
                              <>
                                <button
                                  className="quickPayBtn"
                                  onClick={() => quickPayCurrentMonth(player)}
                                >
                                  Pagar mes
                                </button>

                                <button
                                  className="payBtn"
                                  onClick={() => openPaymentModal(player)}
                                >
                                  Otro pago
                                </button>

                                <button
                                  className="historyBtn"
                                  onClick={() => setHistoryModal(player)}
                                >
                                  Historial
                                </button>
                              </>
                            )}

                            <button
                              className="copyBtn"
                              onClick={() => copyCarnetLink(player)}
                            >
                              Copiar link
                            </button>

                            <button
  className="carnetBtn"
  onClick={() => window.open(`${API_URL}/public-api/validate/${player.qrToken}/view`, '_blank')}
>
  🪪 Ver carnet
</button>

                            <button
                              className="deleteBtn"
                              onClick={() => openDeleteModal(player)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {paymentModal && (
        <div className="modalOverlay">
          <div className="paymentModal">
            <button className="modalClose" onClick={() => setPaymentModal(null)}>
              ×
            </button>

            <h2>Registrar pago</h2>

            <p>
              Persona: <strong>{getPlayerName(paymentModal)}</strong>
            </p>

            <div className="defaultAmountNote">
              Monto sugerido de cuota: <strong>${DEFAULT_PAYMENT_AMOUNT}</strong>
            </div>

            <form onSubmit={registerPayment} className="paymentForm">
              <label>
                Mes
                <select
                  value={paymentForm.month}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      month: Number(e.target.value),
                    })
                  }
                >
                  {monthNames.slice(1).map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Año
                <input
                  type="number"
                  value={paymentForm.year}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      year: Number(e.target.value),
                    })
                  }
                />
              </label>

              <label>
                Monto
                <input
                  type="number"
                  placeholder="Ej: 5000"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: e.target.value,
                    })
                  }
                />
              </label>

              <button type="submit" className="payConfirmBtn">
                Confirmar pago
              </button>
            </form>
          </div>
        </div>
      )}

      {historyModal && (
        <div className="modalOverlay">
          <div className="paymentModal">
            <button className="modalClose" onClick={() => setHistoryModal(null)}>
              ×
            </button>

            <h2>Historial de pagos</h2>

            <p>
              Persona: <strong>{getPlayerName(historyModal)}</strong>
            </p>

            {historyModal.payments?.length > 0 ? (
              <>
                <div className="lastPaymentBox">
                  <div>
                    <h3>Última cuota registrada</h3>
                    <p>
                      {monthNames[historyModal.payments[0].month]}{" "}
                      {historyModal.payments[0].year}
                    </p>
                  </div>

                  <strong>${historyModal.payments[0].amount}</strong>
                </div>

                <div className="historyList">
                  {historyModal.payments.map((payment) => (
                    <div className="historyItem" key={payment.id}>
                      <div className="historyLeft">
                        <strong className="historyMonth">
                          {monthNames[payment.month]} {payment.year}
                        </strong>

                        <div className="paymentBadge">{payment.status}</div>

                        <span className="historyDate">
                          {new Date(payment.paidAt).toLocaleDateString("es-AR")}
                        </span>
                      </div>

                      <div className="historyRight">
  ${formatAmount(payment.amount)}
  <button
    className="deletePaymentBtn"
    onClick={() => deletePaymentById(payment.id)}
    title="Eliminar pago"
  >
    🗑️
  </button>
</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="emptyHistory">
                Esta persona todavía no tiene pagos registrados.
              </div>
            )}
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="modalOverlay">
          <div className="deleteModal">
            <button className="modalClose" onClick={() => setDeleteModal(null)}>
              ×
            </button>

            <div className="deleteIcon">⚠️</div>
            <h2>Eliminar persona</h2>
            <p>
              Esta acción eliminará a <strong>{getPlayerName(deleteModal)}</strong> del sistema.
            </p>
            <p className="deleteWarning">No se puede deshacer.</p>

            <div className="deleteActions">
              <button className="cancelBtn" onClick={() => setDeleteModal(null)}>
                Cancelar
              </button>

              <button className="deleteBtn" onClick={confirmDeletePlayer}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="clubFooter">
        <div className="footerLine left"></div>

        <img
          src="/escudo-victoria.png"
          alt="Escudo Club Victoria"
          className="footerLogo"
        />

        <div className="footerLine right"></div>

        <h3>CLUB VICTORIA</h3>

        <p>
          Pasión <span>•</span> Identidad <span>•</span> Familia
        </p>
      </footer>
    </main>
  );
}

export default App;
