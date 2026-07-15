# Local-API push over Tailscale

The cloud Read-Write API can only do the board's default flip. The board's
**Local API** (`http://<board-ip>:7000/local-api/message`) accepts a flip
`strategy`, which is what makes the per-slide transitions you pick in Studio
actually happen. This guide connects the VPS to your home LAN through
Tailscale so the server can push locally, with automatic fallback to the
cloud API whenever the tunnel is down.

```
Studio server (VPS) ──tailnet──> NAS (subnet router) ──LAN──> Vestaboard :7000
        └── falls back to cloud.vestaboard.com when the local path fails
```

## 1. NAS — advertise your home LAN

You already run Tailscale on the NAS; make it a **subnet router**:

- In the NAS's Tailscale app/settings, enable subnet routing and advertise
  your LAN subnet (e.g. `192.168.1.0/24` — check your router).
  On a CLI this is `tailscale up --advertise-routes=192.168.1.0/24`.
- In the [Tailscale admin console](https://login.tailscale.com/admin/machines),
  open the NAS's machine → Edit route settings → **approve** the advertised
  subnet.
- Give the Vestaboard a **DHCP reservation** in your router so its IP never
  changes. Note that IP — Studio's Settings needs it.

## 2. VPS — join the tailnet

One-time, over SSH on the Hostinger VPS:

```sh
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --accept-routes
```

`--accept-routes` is the important flag — it installs the NAS's subnet route.
Docker containers route outbound traffic through the host, so the Studio
container reaches the board with **no compose changes**.

Sanity check from the VPS: `ping <board-ip>` (or `curl -m 3 http://<board-ip>:7000/`).

## 3. Board — enable the Local API

The Local API is off until Vestaboard enables it for your board:

1. Request a **Local API enablement token** from Vestaboard:
   <https://docs.vestaboard.com/docs/local-api/authentication> (short form;
   they email the token).
2. Redeem it **once, from a machine on your home LAN**:

   ```sh
   curl -X POST http://<board-ip>:7000/local-api/enablement \
     -H "X-Vestaboard-Local-Api-Enablement-Token: <token from the email>"
   ```

   The response contains your permanent **Local API key**.

## 4. Studio — turn it on

In Studio → Settings → **Local board (via Tailscale)**, enter the board's
LAN IP and the Local API key, and Save. Within a few seconds the status pill
switches to **"Pushing locally — transitions active"** and each push in the
logs says `via local`. Pick flip styles per slide in the slide editor —
they're live now.

If the tunnel drops (NAS offline, route unapproved, VPS tailscale down),
pushes log a fallback and go out via the cloud key instead; the board keeps
updating, just with the default flip.

## Troubleshooting

- **Status says cloud, never local** — from the VPS run
  `curl -m 3 http://<board-ip>:7000/local-api/message -H 'X-Vestaboard-Local-Api-Key: <key>'`.
  A timeout means routing (approve the subnet route, `--accept-routes` on the
  VPS); a `401` means the key; a response means Studio's host/key fields.
- **Board IP changed** — set the DHCP reservation, update Settings.
- **503 on pushes** — the board's ~15s hardware window; the pusher already
  waits and retries, nothing to do.
