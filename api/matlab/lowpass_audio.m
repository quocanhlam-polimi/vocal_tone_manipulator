function [y, zi] = lowpass_audio(x, zi, cutoff, Fs)

    order = 4;

    [b, a] = butter(order, cutoff / (Fs / 2), 'low');

    % Ensure input is a column vector
    x = x(:);

    % Initialize filter state
    expected_length = max(length(a), length(b)) - 1;

    if isempty(zi)
        zi = zeros(expected_length, 1);
    else
        zi = zi(:);

        if length(zi) ~= expected_length
            error('Invalid zi length. Expected %d, received %d.', ...
                  expected_length, length(zi));
        end
    end

    [y, zi] = filter(b, a, x, zi);

end