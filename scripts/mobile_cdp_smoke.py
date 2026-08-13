import base64
import json
import os
import time
from pathlib import Path

import requests
import websocket

ROOT = Path(__file__).resolve().parents[1]
CDP_URL = os.environ.get("CDP_URL", "http://127.0.0.1:9222/json/list")
BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000")


def wait_for(predicate, timeout=8.0, interval=0.05):
    deadline = time.time() + timeout
    while time.time() < deadline:
        value = predicate()
        if value:
            return value
        time.sleep(interval)
    raise TimeoutError("Timed out waiting for mobile browser state")


class CdpClient:
    def __init__(self, url):
        self.socket = websocket.create_connection(url, timeout=10)
        self.next_id = 0
        self.events = []

    def command(self, method, params=None):
        self.next_id += 1
        command_id = self.next_id
        self.socket.send(json.dumps({"id": command_id, "method": method, "params": params or {}}))
        while True:
            message = json.loads(self.socket.recv())
            if message.get("id") == command_id:
                if "error" in message:
                    raise RuntimeError(f"CDP {method} failed: {message['error']}")
                return message.get("result", {})
            self.events.append(message)

    def evaluate(self, expression, await_promise=False):
        result = self.command(
            "Runtime.evaluate",
            {
                "expression": expression,
                "awaitPromise": await_promise,
                "returnByValue": True,
            },
        )
        exception = result.get("exceptionDetails")
        if exception:
            raise RuntimeError(exception)
        return result.get("result", {}).get("value")

    def close(self):
        self.socket.close()


def main():
    targets = requests.get(CDP_URL, timeout=5).json()
    page = next(target for target in targets if target.get("type") == "page")
    client = CdpClient(page["webSocketDebuggerUrl"])
    try:
        client.command("Network.enable")
        client.command("Page.enable")
        client.command(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 1,
                "mobile": True,
                "screenWidth": 390,
                "screenHeight": 844,
            },
        )
        client.command("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
        client.command("Page.navigate", {"url": BASE_URL})
        wait_for(lambda: client.evaluate("document.readyState === 'complete'"))
        wait_for(lambda: client.evaluate("Boolean(document.querySelector('#nickname'))"))

        client.evaluate("document.querySelector('#nickname').focus()")
        client.command("Input.insertText", {"text": "MobileTester"})
        client.evaluate("document.querySelector('form button').click()")

        wait_for(
            lambda: client.evaluate(
                "Boolean(document.querySelector('.mobile-controls')) && "
                "getComputedStyle(document.querySelector('.mobile-controls')).display !== 'none'"
            ),
            timeout=10,
        )
        time.sleep(2.0)

        mobile_state = client.evaluate(
            "(() => {"
            "const panel = document.querySelector('.mobile-controls');"
            "const buttons = [...document.querySelectorAll('.touch-control')].map((button) => {"
            "const rect = button.getBoundingClientRect();"
            "return {label: button.getAttribute('aria-label'), x: rect.x, y: rect.y, width: rect.width, height: rect.height};"
            "});"
            "const viewport = document.querySelector('meta[name=viewport]')?.content || '';"
            "const rect = panel.getBoundingClientRect();"
            "return {display: getComputedStyle(panel).display, viewport, innerWidth: window.innerWidth, innerHeight: window.innerHeight, panel: {x: rect.x, y: rect.y, width: rect.width, height: rect.height}, buttons};"
            "})()"
        )
        assert mobile_state["innerWidth"] == 390, mobile_state
        assert "width=device-width" in mobile_state["viewport"], mobile_state
        assert mobile_state["display"] != "none", mobile_state
        assert len(mobile_state["buttons"]) == 6, mobile_state
        assert all(button["width"] >= 48 and button["height"] >= 48 for button in mobile_state["buttons"]), mobile_state

        right = next(button for button in mobile_state["buttons"] if button["label"] == "→")
        x = right["x"] + right["width"] / 2
        y = right["y"] + right["height"] / 2
        client.command("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y, "id": 1}], "modifiers": 0})
        time.sleep(0.45)
        client.command("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [], "modifiers": 0})
        time.sleep(0.45)

        payloads = [
            event.get("params", {}).get("response", {}).get("payloadData", "")
            for event in client.events
            if event.get("method") == "Network.webSocketFrameSent"
        ]
        right_pressed = any('"right":true' in payload for payload in payloads)
        assert right_pressed, {"payloads": payloads[-10:]}

        screenshot = client.command("Page.captureScreenshot", {"format": "png"})["data"]
        (ROOT / "verification" / "mobile-after.png").write_bytes(base64.b64decode(screenshot))
        print(json.dumps({"ok": True, "mobile": mobile_state, "rightControlSent": right_pressed}, indent=2))
    finally:
        client.close()


if __name__ == "__main__":
    main()
