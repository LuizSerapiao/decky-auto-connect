const manifest = {"name":"Bazzite Bluetooth Autoconnect"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var attr = props.attr,
      size = props.size,
      title = props.title,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaBluetoothB (props) {
  return GenIcon({"attr":{"viewBox":"0 0 320 512"},"child":[{"tag":"path","attr":{"d":"M196.48 260.023l92.626-103.333L143.125 0v206.33l-86.111-86.111-31.406 31.405 108.061 108.399L25.608 368.422l31.406 31.405 86.111-86.111L145.84 512l148.552-148.644-97.912-103.333zm40.86-102.996l-49.977 49.978-.338-100.295 50.315 50.317zM187.363 313.04l49.977 49.978-50.315 50.316.338-100.294z"},"child":[]}]})(props);
}

const getDevices = callable("get_devices");
const scanDevices = callable("scan_devices");
const pairAndConnect = callable("pair_and_connect");
const removeDevice = callable("remove_device");
function ControllerList() {
    const [devices, setDevices] = SP_REACT.useState([]);
    const [nearbyDevices, setNearbyDevices] = SP_REACT.useState([]);
    const [error, setError] = SP_REACT.useState(null);
    const [loading, setLoading] = SP_REACT.useState(true);
    const [removing, setRemoving] = SP_REACT.useState(null);
    const [scanning, setScanning] = SP_REACT.useState(false);
    const [connecting, setConnecting] = SP_REACT.useState(null);
    const refresh = SP_REACT.useCallback(async () => {
        try {
            setDevices(await getDevices());
            setError(null);
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        }
        finally {
            setLoading(false);
        }
    }, []);
    SP_REACT.useEffect(() => {
        void refresh();
        const timer = window.setInterval(() => void refresh(), 10000);
        return () => window.clearInterval(timer);
    }, [refresh]);
    const onRemove = async (address) => {
        setRemoving(address);
        try {
            setDevices(await removeDevice(address));
            setError(null);
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        }
        finally {
            setRemoving(null);
        }
    };
    const onScan = async () => {
        setScanning(true);
        setError(null);
        try {
            setNearbyDevices(await scanDevices());
            await refresh();
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        }
        finally {
            setScanning(false);
        }
    };
    const onPairAndConnect = async (address) => {
        setConnecting(address);
        setError(null);
        try {
            setDevices(await pairAndConnect(address));
            setNearbyDevices((current) => current.map((device) => device.address === address
                ? { ...device, paired: true, connected: true }
                : device));
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        }
        finally {
            setConnecting(null);
        }
    };
    return (SP_REACT.createElement(SP_REACT.Fragment, null,
        SP_REACT.createElement(DFL.PanelSection, { title: "Dispositivos Bluetooth pr\u00F3ximos" },
            SP_REACT.createElement(DFL.PanelSectionRow, null,
                SP_REACT.createElement(DFL.ButtonItem, { layout: "below", disabled: scanning || connecting !== null, onClick: () => void onScan() }, scanning ? "Pesquisando por 8 segundos..." : "Pesquisar dispositivos")),
            nearbyDevices.map((device) => (SP_REACT.createElement(DFL.PanelSectionRow, { key: device.address },
                SP_REACT.createElement("div", { style: {
                        alignItems: "center",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        width: "100%",
                    } },
                    SP_REACT.createElement("div", { style: { minWidth: 0 } },
                        SP_REACT.createElement("div", null, device.name),
                        SP_REACT.createElement("div", { style: { fontFamily: "monospace", opacity: 0.7 } }, device.address),
                        SP_REACT.createElement("div", { style: { fontSize: "12px", opacity: 0.7 } }, device.connected ? "Conectado" : device.paired ? "Pareado" : "Não pareado")),
                    SP_REACT.createElement("button", { type: "button", disabled: connecting !== null || scanning, onClick: () => void onPairAndConnect(device.address), style: { flexShrink: 0 } }, connecting === device.address
                        ? "Conectando..."
                        : device.paired
                            ? "Conectar"
                            : "Parear"))))),
            !scanning && nearbyDevices.length === 0 && (SP_REACT.createElement(DFL.PanelSectionRow, null,
                SP_REACT.createElement("div", null, "Pesquise para encontrar dispositivos Bluetooth vis\u00EDveis.")))),
        SP_REACT.createElement(DFL.PanelSection, { title: "Dispositivos que ser\u00E3o reconectados" },
            loading && devices.length === 0 && (SP_REACT.createElement(DFL.PanelSectionRow, null,
                SP_REACT.createElement("div", null, "Carregando dispositivos..."))),
            devices.map((address) => (SP_REACT.createElement(DFL.PanelSectionRow, { key: address },
                SP_REACT.createElement("div", { style: {
                        alignItems: "center",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        width: "100%",
                    } },
                    SP_REACT.createElement("span", { style: { fontFamily: "monospace" } }, address),
                    SP_REACT.createElement("button", { type: "button", disabled: removing !== null, onClick: () => void onRemove(address), style: { flexShrink: 0 } }, removing === address ? "Desemparelhando..." : "Remover e desemparelhar"))))),
            !loading && devices.length === 0 && !error && (SP_REACT.createElement(DFL.PanelSectionRow, null,
                SP_REACT.createElement("div", null, "Nenhum dispositivo adicionado. Pareie e conecte um dispositivo acima."))),
            error && (SP_REACT.createElement(DFL.PanelSectionRow, null,
                SP_REACT.createElement("div", { role: "alert", style: { color: "#ff6b6b" } },
                    "Erro: ",
                    error))),
            SP_REACT.createElement(DFL.PanelSectionRow, null,
                SP_REACT.createElement(DFL.ButtonItem, { layout: "below", onClick: () => void refresh() }, "Atualizar lista de reconex\u00E3o")))));
}
var index = definePlugin(() => ({
    name: "Bazzite Bluetooth Autoconnect",
    titleView: SP_REACT.createElement("div", { className: DFL.staticClasses.Title }, "Bazzite Bluetooth"),
    content: SP_REACT.createElement(ControllerList, null),
    icon: SP_REACT.createElement(FaBluetoothB, null),
}));

export { index as default };
//# sourceMappingURL=index.js.map
