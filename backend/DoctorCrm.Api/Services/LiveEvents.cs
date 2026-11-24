using System.Collections.Concurrent;
using System.Threading.Channels;
using DoctorCrm.Api.DTOs;

namespace DoctorCrm.Api.Services;

/// <summary>
/// In-memory fan-out of live events to every open GrowDesk screen (Server-Sent Events, see
/// LiveController). One API instance runs, so no message broker is needed. A screen that was
/// disconnected catches up from the database when it reconnects, so nothing depends on this
/// buffer surviving.
/// </summary>
public class LiveEvents
{
    private readonly ConcurrentDictionary<Guid, Channel<ILiveEvent>> _subscribers = new();

    public (Guid Id, ChannelReader<ILiveEvent> Reader) Subscribe()
    {
        // A stalled screen drops its oldest events instead of holding memory; it catches up on reconnect.
        var channel = Channel.CreateBounded<ILiveEvent>(new BoundedChannelOptions(50) { FullMode = BoundedChannelFullMode.DropOldest });
        var id = Guid.NewGuid();
        _subscribers[id] = channel;
        return (id, channel.Reader);
    }

    public void Unsubscribe(Guid id)
    {
        if (_subscribers.TryRemove(id, out var channel)) channel.Writer.TryComplete();
    }

    public void Publish(ILiveEvent evt)
    {
        foreach (var channel in _subscribers.Values) channel.Writer.TryWrite(evt);
    }

    public int SubscriberCount => _subscribers.Count;

    /// <summary>A number that has been quiet this long starts a new conversation, which alerts again.</summary>
    public static readonly TimeSpan ConversationGap = TimeSpan.FromMinutes(30);

    private readonly ConcurrentDictionary<string, DateTime> _lastMessage = new();

    /// <summary>
    /// True for the first message of a conversation: the number hadn't written for
    /// <see cref="ConversationGap"/>. Every message keeps the conversation open, so a long chat
    /// alerts once. Kept in memory: after a restart the next message alerts again.
    /// </summary>
    public bool StartsConversation(string number, DateTime now)
    {
        var starts = true;
        _lastMessage.AddOrUpdate(number, now, (_, last) =>
        {
            starts = now - last >= ConversationGap;
            return now;
        });
        // Forget quiet numbers now and then, so the map stays small.
        if (_lastMessage.Count > 5000)
            foreach (var (key, last) in _lastMessage)
                if (now - last >= ConversationGap) _lastMessage.TryRemove(key, out _);
        return starts;
    }
}
