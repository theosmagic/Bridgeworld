using System;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

/// <summary>
/// Golem — Cycle 2 embodied AI WebSocket bridge.
/// Connects Unity character to the MemOS-backed AI backend at
/// treasure.bridgeworld.lol/agents/chat/external:{characterId}
/// </summary>
public class CFConnector : MonoBehaviour
{
    [Header("Connection")]
    [SerializeField] private string hostAddress   = "treasure.bridgeworld.lol";
    [SerializeField] private string characterId   = "golem_legion_01";
    [SerializeField] private bool   encryptedChannel = true;

    private ClientWebSocket          wsClient;
    private CancellationTokenSource  cancelSource;

    async void Start()
    {
        cancelSource = new CancellationTokenSource();
        string protocol = encryptedChannel ? "wss" : "ws";
        string endpoint = $"{protocol}://{hostAddress}/agents/chat/external:{characterId}";

        wsClient = new ClientWebSocket();
        try
        {
            await wsClient.ConnectAsync(new Uri(endpoint), cancelSource.Token);
            Debug.Log($"[Golem] Bound to WebSocket: {endpoint}");
            _ = ReceiveActionCommands();
        }
        catch (Exception ex)
        {
            Debug.LogError($"[Golem] WebSocket connection failed: {ex.Message}");
        }
    }

    private async Task ReceiveActionCommands()
    {
        byte[] buffer = new byte[1024 * 8];
        while (wsClient.State == WebSocketState.Open && !cancelSource.Token.IsCancellationRequested)
        {
            var result = await wsClient.ReceiveAsync(new ArraySegment<byte>(buffer), cancelSource.Token);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                await wsClient.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", cancelSource.Token);
            }
            else
            {
                string json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                DispatchCommand(json);
            }
        }
    }

    /// <summary>
    /// Routes incoming AI command frames to CharacterActionController.
    /// Frame schema: {"command": "EXECUTE_PATH", "destination_coords": [x, y, z]}
    /// </summary>
    private void DispatchCommand(string jsonCommand)
    {
        Debug.Log($"[Golem] Command received: {jsonCommand}");
        // TODO: deserialize and route to CharacterActionController.cs
    }

    public async Task SendMessage(string jsonPayload)
    {
        if (wsClient?.State != WebSocketState.Open) return;
        byte[] bytes = Encoding.UTF8.GetBytes(jsonPayload);
        await wsClient.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, cancelSource.Token);
    }

    async void OnDestroy()
    {
        cancelSource?.Cancel();
        if (wsClient != null)
        {
            await wsClient.CloseAsync(WebSocketCloseStatus.NormalClosure, "Scene unloaded", CancellationToken.None);
            wsClient.Dispose();
        }
    }
}
