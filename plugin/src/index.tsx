import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses,
} from "@decky/ui";
import { callable, definePlugin } from "@decky/api";
import React, { useCallback, useEffect, useState } from "react";
import { FaBluetoothB } from "react-icons/fa";

const getDevices = callable<[], string[]>("get_devices");
type BluetoothDevice = {
  address: string;
  name: string;
  paired: boolean;
  connected: boolean;
};
const scanDevices = callable<[], BluetoothDevice[]>("scan_devices");
const pairAndConnect = callable<[address: string], string[]>("pair_and_connect");
const removeDevice = callable<[address: string], string[]>("remove_device");

function ControllerList() {
  const [devices, setDevices] = useState<string[]>([]);
  const [nearbyDevices, setNearbyDevices] = useState<BluetoothDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDevices(await getDevices());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const onRemove = async (address: string) => {
    setRemoving(address);
    try {
      setDevices(await removeDevice(address));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setRemoving(null);
    }
  };

  const onScan = async () => {
    setScanning(true);
    setError(null);
    try {
      setNearbyDevices(await scanDevices());
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setScanning(false);
    }
  };

  const onPairAndConnect = async (address: string) => {
    setConnecting(address);
    setError(null);
    try {
      setDevices(await pairAndConnect(address));
      setNearbyDevices((current) =>
        current.map((device) =>
          device.address === address
            ? { ...device, paired: true, connected: true }
            : device,
        ),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setConnecting(null);
    }
  };

  return (
    <>
    <PanelSection title="Dispositivos Bluetooth próximos">
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={scanning || connecting !== null} onClick={() => void onScan()}>
          {scanning ? "Pesquisando por 8 segundos..." : "Pesquisar dispositivos"}
        </ButtonItem>
      </PanelSectionRow>
      {nearbyDevices.map((device) => (
        <PanelSectionRow key={device.address}>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              width: "100%",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div>{device.name}</div>
              <div style={{ fontFamily: "monospace", opacity: 0.7 }}>{device.address}</div>
              <div style={{ fontSize: "12px", opacity: 0.7 }}>
                {device.connected ? "Conectado" : device.paired ? "Pareado" : "Não pareado"}
              </div>
            </div>
            <button
              type="button"
              disabled={connecting !== null || scanning}
              onClick={() => void onPairAndConnect(device.address)}
              style={{ flexShrink: 0 }}
            >
              {connecting === device.address
                ? "Conectando..."
                : device.paired
                  ? "Conectar"
                  : "Parear"}
            </button>
          </div>
        </PanelSectionRow>
      ))}
      {!scanning && nearbyDevices.length === 0 && (
        <PanelSectionRow>
          <div>Pesquise para encontrar dispositivos Bluetooth visíveis.</div>
        </PanelSectionRow>
      )}
    </PanelSection>
    <PanelSection title="Dispositivos que serão reconectados">
      {loading && devices.length === 0 && (
        <PanelSectionRow>
          <div>Carregando dispositivos...</div>
        </PanelSectionRow>
      )}
      {devices.map((address) => (
        <PanelSectionRow key={address}>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              width: "100%",
            }}
          >
            <span style={{ fontFamily: "monospace" }}>{address}</span>
            <button
              type="button"
              disabled={removing !== null}
              onClick={() => void onRemove(address)}
              style={{ flexShrink: 0 }}
            >
              {removing === address ? "Desemparelhando..." : "Remover e desemparelhar"}
            </button>
          </div>
        </PanelSectionRow>
      ))}
      {!loading && devices.length === 0 && !error && (
        <PanelSectionRow>
          <div>Nenhum dispositivo adicionado. Pareie e conecte um dispositivo acima.</div>
        </PanelSectionRow>
      )}
      {error && (
        <PanelSectionRow>
          <div role="alert" style={{ color: "#ff6b6b" }}>
            Erro: {error}
          </div>
        </PanelSectionRow>
      )}
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => void refresh()}>
          Atualizar lista de reconexão
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
    </>
  );
}

export default definePlugin(() => ({
  name: "Bazzite Bluetooth Autoconnect",
  titleView: <div className={staticClasses.Title}>Bazzite Bluetooth</div>,
  content: <ControllerList />,
  icon: <FaBluetoothB />,
}));
