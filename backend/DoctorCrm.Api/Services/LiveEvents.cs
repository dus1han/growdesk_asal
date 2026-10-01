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
    private readonly ConcurrentDictionary<Guid, Channel<LiveBookingEventDto>> _subscribers = new();

    public (Guid Id, ChannelReader<LiveBookingEventDto> Reader) Subscribe()
    {
        // A stalled screen drops its oldest events instead of holding memory; it catches up on reconnect.
        var channel = Channel.CreateBounded<LiveBookingEventDto>(new BoundedChannelOptions(50) { FullMode = BoundedChannelFullMode.DropOldest });
        var id = Guid.NewGuid();
        _subscribers[id] = channel;
        return (id, channel.Reader);
    }

    public void Unsubscribe(Guid id)
    {
        if (_subscribers.TryRemove(id, out var channel)) channel.Writer.TryComplete();
    }

    public void Publish(LiveBookingEventDto evt)
    {
        foreach (var channel in _subscribers.Values) channel.Writer.TryWrite(evt);
    }

    public int SubscriberCount => _subscribers.Count;
}
